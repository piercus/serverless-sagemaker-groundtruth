const puppeteer = require('puppeteer');

/**
* @param {String} workerId
* @param {Object} prelambdaOutput
* @param {PuppeteerModule} puppeteerMod module that simulate the behavior of a worker
* @param {String} url
* @param {Object} manifestRow js object reproesnting the manifest row
* @param {String} [debuggingScreenshot='./puppeteer-screenshot.png']
* @param {String} [submitSelector='button.awsui-button[type="submit"]']
* @param {Object} [puppeteerOptions={}]
*/

module.exports = function ({
	workerId,
	prelambdaOutput,
	manifestRow,
	puppeteerMod,
	url,
	debuggingScreenshot = './puppeteer-screenshot.png',
	submitSelector = 'button.awsui-button[type="submit"]',
	puppeteerOptions = {}
}) {
	const puppeteerModuleOptions = {workerId, manifestRow, prelambdaOutput};

	return puppeteer.launch(puppeteerOptions)
		.then(browser => {
			return browser.newPage()
				.then(page => {
					puppeteerModuleOptions.page = page;
					console.log(`Worker ${workerId} : Opening ${url}`);
					// Makes the library available in evaluate functions which run within the browser context
					return page.goto(url, {waitUntil: 'networkidle0'})
						.then(() => page.addScriptTag({
							path: require.resolve('query-selector-shadow-dom/dist/querySelectorShadowDom')
						}))
						.then(() => puppeteerMod(puppeteerModuleOptions))
						.then(() =>
							page.waitForFunction(selector => {
								const btn = querySelectorShadowDom.querySelectorDeep(selector);// eslint-disable-line no-undef
								return btn;
							}, {}, submitSelector).catch(error => {
								throw (new Error(`The page submit button should match selector ${submitSelector}: (${error})`));
							}).then(a => a.asElement())
						)
						.then(btn => {
							return btn.click();
						})
						.then(() => {
							return page.waitForFunction(() => {
								return querySelectorShadowDom.querySelectorDeep('table code').innerHTML;// eslint-disable-line no-undef
							}).catch(error => {
								return page.screenshot({path: debuggingScreenshot}).then(() => {
									throw (new Error(`Not able to get the code from the page, the json output should appear in a $("table code") element, (screenshot saved in ${debuggingScreenshot}): (${error})`));
								});
							})
								.then(a => a.jsonValue());
						});
				})
				.finally(() => {
					browser.close();
				})
				.then(jsonString => {
					const parsed = JSON.parse(jsonString);
					return parsed[0];
				});
		})
		.then(result => {
			// This is only working for custom task on aws Sagemaker
			// For prebuild task, amazon is adding a key
			// For example for boundingBox, we should do something like {workerId, annotationData: {content : JSON.stringify({boundingBox: result.annotatedResult})}}
			// For now this is not done but it should be studied in depth to make a generic solution
			// and be compatible with all type of sagemaker groundtruth task
			return {workerId, annotationData: {content: JSON.stringify(result)}};
		});
};
