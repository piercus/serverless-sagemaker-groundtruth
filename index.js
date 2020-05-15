'use strict';

const path = require('path');

const {invokePreLambda, startServer, invokePostLambda, simulateAllWorkers, loadFileRow} = require('./lib');

class ServerlessSagemakerGroundtruth {
	constructor(serverless, options) {
		this.serverless = serverless;
		this.options = options;

		const groundTruthOptions = {
			groundtruthTask: {
				usage: 'Specify the task to use, should correspond to a groundtruthTask in your serverless.yml file',
				shortcut: 't',
				required: true
			},
			manifest: {
				usage: 'Specify the input manifest file to use, can be local file or s3 uri',
				shortcut: 'm',
				required: true
			},
			row: {
				usage: 'Specify the row of the input manifest to use, by default this will be 0 (first row)',
				shortcut: 'r',
				required: false
			},
			port: {
				usage: 'The port to use for the server to serve the page (by default it will be 3000)',
				shortcut: 'p',
				required: false
			},
			consolidationRequest: {
				usage: 'Json filename used as consolidation request file for the post lambda function, the plugin will create a fake event from this filename',
				required: false
			},
			consolidationRequestEvent: {
				usage: 'Json filename used as input of your post lambda function',
				required: false
			},
			workerIds: {
				usage: 'comma separated list of workerIds to use for simulation',
				required: true
			},
			puppeteerModule: {
				usage: 'path to a puppeteer module to simulate worker\'s behavior, for more information see https://github.com/piercus/serverless-sagemaker-groundtruth',
				required: true
			}
		};

		this.commands = {
			groundtruth: {
				commands: {
					// To do
					// 'create-task' : {
					// 	usage: 'Create a task from a specific task defined in serverless.yml',
					// 	lifecycleEvents: ['start']
					// },
					serve: {
						usage: 'Serve a specific liquid template, read manifest file, call pre-lambda function',
						lifecycleEvents: ['prelambda', 'startserver'],
						options: {
							groundtruthTask: groundTruthOptions.groundtruthTask,
							manifest: groundTruthOptions.manifest,
							row: groundTruthOptions.row,
							port: groundTruthOptions.port
						}
					},
					test: {
						commands: {
							pre: {
								usage: 'Run pre-lambda locally for each of the row of the manifest file',
								lifecycleEvents: ['prelambda'],
								options: {
									groundtruthTask: groundTruthOptions.groundtruthTask,
									manifest: groundTruthOptions.manifest
								}
							},
							post: {
								usage: 'Run post-lambda locally from a specific consolidation-request file or from an event',
								lifecycleEvents: ['postlambda'],
								options: {
									groundtruthTask: groundTruthOptions.groundtruthTask,
									consolidationRequest: groundTruthOptions.consolidationRequest,
									event: groundTruthOptions.consolidationRequestEvent
								}
							},
							e2e: {
								usage: 'Simulate the whole process (prelambda, startserver, simulate user behavior, postlambda)',
								lifecycleEvents: ['prelambda', 'startserver', 'simulateAllWorkers', 'postlambda', 'stopserver'],
								options: {
									groundtruthTask: groundTruthOptions.groundtruthTask,
									manifest: groundTruthOptions.manifest,
									port: groundTruthOptions.port,
									workerIds: groundTruthOptions.workerIds,
									puppeteerModule: groundTruthOptions.puppeteerModule
								}
							}
						}
					}
				}
			}
		};

		this.hooks = {
			'groundtruth:serve:prelambda': this.prelambda.bind(this),
			'groundtruth:serve:startserver': this.startserver.bind(this),
			'groundtruth:test:e2e:stopserver': this.stopserver.bind(this),
			'groundtruth:test:e2e:prelambda': this.prelambda.bind(this),
			'groundtruth:test:e2e:startserver': this.startserver.bind(this),
			'groundtruth:test:e2e:simulateAllWorkers': this.simulateAllWorkers.bind(this),
			'groundtruth:test:e2e:postlambda': this.postlambda.bind(this)
		};
	}

	prelambda() {
		const task = this.getServerlessGroundtruthTask();
		return loadFileRow({s3Uri: this.options.manifest})
			.then(rowData => {
				const manifestRow = JSON.parse(rowData);
				this.manifestRow = manifestRow;
				return invokePreLambda({
					lambda: this.getLambda(task.pre),
					manifestRow
				});
			}).then(result => {
				this.prelambdaOutput = result;
			});
	}

	startserver() {
		this.port = this.options.port || 3000;
		return startServer({
			template: this.task.template,
			prelambdaOutput: this.prelambdaOutput,
			port: this.port
		}).then(({server}) => {
			this.server = server;
		});
	}

	stopserver() {
		if (this.server) {
			return new Promise((resolve, reject) => this.server.close(err => {
				if (err) {
					return reject(err);
				}

				this.server = null;
				return resolve();
			}));
		}
	}

	simulateAllWorkers() {
		const workerIds = this.options.workerIds.split(',');
		const manifestRow = this.manifestRow;
		const prelambdaOutput = this.prelambdaOutput;

		const url = 'http://localhost:' + this.port;
		const modPath = path.join(
			this.serverless.config.servicePath,
			this.options.extraServicePath || '',
			this.options.puppeteerModule
		);
		const puppeteerMod = require(modPath);

		return simulateAllWorkers({workerIds, prelambdaOutput, manifestRow, puppeteerMod, url})
			.then(consolidationRequestData => {
				this.consolidationRequestData = consolidationRequestData;
			});
	}

	getServerlessGroundtruthTask() {
		if (!this.options.groundtruthTask) {
			throw (new Error(`this.options.groundtruthTask is mandatory (Currently : ${this.options.groundtruthTask})`));
		}

		const {groundtruthTasks} = this.serverless.pluginManager.serverlessConfigFile;

		if (!groundtruthTasks) {
			throw (new Error(`${this.options.groundtruthTask} not found in serverless.yml (no groundtruthTasks key found)`));
		}

		if (!groundtruthTasks[this.options.groundtruthTask]) {
			throw (new Error(`${this.options.groundtruthTask} not found in serverless.yml (possible values are ${Object.keys(groundtruthTasks)})`));
		}

		this.task = groundtruthTasks[this.options.groundtruthTask];
		return this.task;
	}

	postlambda() {
		const task = this.getServerlessGroundtruthTask();
		return invokePostLambda({
			lambda: this.getLambda(task.post),
			consolidationRequestData: this.consolidationRequestData,
			manifestRows: [this.manifestRow]
		}).then(result => {
			console.log(`Post lambda results is :\n${JSON.stringify(result, null, 2)}`);
		});
	}

	getLambda(functionName) {
		this.options.functionObj = this.serverless.service.getFunction(functionName);

		const handler = this.options.functionObj.handler;

		// Copy paste from https://github.com/serverless/serverless/blob/master/lib/plugins/aws/invokeLocal/index.js#L180
		const handlerSeparatorIndex = handler.lastIndexOf('.');
		const handlerPath = handler.slice(0, handlerSeparatorIndex);
		const handlerName = handler.slice(handlerSeparatorIndex + 1);

		const pathToHandler = path.join(
			this.serverless.config.servicePath,
			this.options.extraServicePath || '',
			handlerPath
		);
		const handlersContainer = require(pathToHandler);
		return handlersContainer[handlerName];
	}
}

module.exports = ServerlessSagemakerGroundtruth;
