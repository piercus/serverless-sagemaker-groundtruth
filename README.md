# serverless-sagemaker-groundtruth

This serverless plugin includes a set of utilities to implement custom workflow for [AWS Sagemaker Groundtruth](https://aws.amazon.com/fr/sagemaker/groundtruth/)

Currently includes : 
* Serve liquid template from manifest file + prelambda the same it is done on [AWS Sagemaker Groundtruth](https://aws.amazon.com/fr/sagemaker/groundtruth/)
* Run End to end test pre-lambda -> labelling simulation -> post lambda

Any Pull request will be warmly welcome !

Ideas for future implementation :
* Create Tasks from serverless CLI
* Test Chained tasks
* Expose nodejs api to integrate with testing suites

## Installation

```
npm install --save-dev serverless-sagemaker-groundtruth
```

## Usage

### Example serverless.yml

In order to use this module, you need to add a `groundtruthTasks` key into your `serverless.yml` file

```yml
...

plugins:
  - serverless-sagemaker-groundtruth

functions:
  pre-example: 
    handler: handler.pre
    name: pre
  post-example: 
    handler: handler.postObjectDetection
    name: post

groundtruthTasks:
  basic:
    pre: pre-example
    post: post-example
    template: app/templates/object-detection/basic.liquid.html
```

### Serve a liquid template against a manifest file

```bash
serverless groundtruth serve --groundtruthTask <groundtruthTask-name> --manifest <s3-uri or local file>
```

### Test e2e behavior of sagemaker groundtruth workflow

#### The puppeteer module example

Here, we create a [puppeteer](https://github.com/puppeteer/puppeteer) module which is doing random bounding boxes (using [hasard](https://www.npmjs.com/package/hasard) library) :

```js
const BbPromise = require('bluebird')
const h = require('hasard');

/**
* This function is binding a sequence of actions made by the user before submitting the form
* This is an example showing how to simulate a use bounding box actions
* @param {Page} page puppeteer page instance see https://github.com/puppeteer/puppeteer
* This page is open and running in the annotation page
* @param {Object} manifestRow the object from the manifest file row
* @param {Object} prelambdaOutput the output object from the prelambda result
* @returns {Promise} the promise is resolved once the user has done all needed actions on the form
*/

module.exports = function({
	page, 
	manifestRow,  
	prelambdaOutput, // eslint-disable-line no-unused-vars
	workerId
}){
	
	// we draw 5 boxes for each worker
	const nBoxes = 5;
	
	// Cat and Dog
	const nCategories = 2;
	
	// Using the technic from https://github.com/puppeteer/puppeteer/issues/858#issuecomment-438540596 to select the node
	return page.evaluateHandle(`document.querySelector("body > crowd-form > form > crowd-bounding-box").shadowRoot.querySelector("#annotation-area-container > div > div > div")`)
		.then(imageCanvas => {
			return imageCanvas.boundingBox()
		}).then(boundingBox => {
			
			// define a random bounding box over the image canvas using hasard library
			// see more example in https://www.npmjs.com/package/hasard
			const width = h.reference(h.integer(0, Math.floor(boundingBox.width)));
			const height = h.reference(h.integer(0, Math.floor(boundingBox.height)));
			const top = h.add(h.integer(0, h.substract(Math.floor(boundingBox.width), width)), Math.floor(boundingBox.x));
			const left = h.add(h.integer(0, h.substract(Math.floor(boundingBox.height), height)), Math.floor(boundingBox.y));

			const randomAnnotation = h.object({
				box: h.array([
					top,
					left,
					width,
					height
				]),
				category: h.integer(0, 1)
			});
			
			const workerAnnotations = randomAnnotation.run(nBoxes)
			
			return BbPromise.map(workerAnnotations, ({box, category}) => {
				return page.evaluateHandle(`document.querySelector("body > crowd-form > form > crowd-bounding-box").shadowRoot.querySelector("#react-mount-point > div > div > awsui-app-layout > div > div.awsui-app-layout__tools.awsui-app-layout--open > aside > div > span > div > div.label-pane-content > div:nth-child(${category+1})")`)
					.then(categoryButton => categoryButton.click())
					.then(() => page.mouse.move(box[0], box[1]))
					.then(() => page.mouse.down())
					.then(() => page.mouse.move(box[0]+box[2], box[1]+box[3]))
					.then(() => page.mouse.up());
				
			}, {concurrency: 1})
		}).then(() => {
			console.log(`${workerId} actions simulation done on ${JSON.stringify(manifestRow)}`)
			// at the end we return nothing, serverless-sagemaker-groundtruth will automatically request the output from the page
		})
}
```

#### The command

```bash
serverless groundtruth test e2e \
	--groundtruthTask <groundtruthTask-name> \
	--manifest <s3-uri or local file> \
	--puppeteerModule <path to the module> \
	--workerIds a,b,c
```

## Remarks

### Local consolidation request file compatibilty

You need to make sure that you post lambda function is compatible with using local filename in `event.payload.s3Uri`

### Template

Your template should be submited using a button that can match with `button.awsui-button[type="submit"]` selector.