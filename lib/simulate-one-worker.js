const puppeteer = require('puppeteer');
const path = require('path');

module.exports = function ({workerId, prelambdaOutput, manifestRow, puppeteerMod, url}) {
	const puppeteerOptions = {workerId, manifestRow, prelambdaOutput};

	return puppeteer.launch()
		.then(browser => {
			return browser.newPage()
				.then(page => {
					puppeteerOptions.page = page;
					console.log(`Worker ${workerId} : Opening ${url}`);
					// Makes the library available in evaluate functions which run within the browser context
					return page.goto(url, {waitUntil: 'networkidle0'})
						.then(() => page.addScriptTag({
							path: path.join(__dirname, '../node_modules/query-selector-shadow-dom/dist/querySelectorShadowDom.js')
						}))
						.then(() => puppeteerMod(puppeteerOptions))
						.then(() => page.waitForFunction(() => {
							const btn = querySelectorShadowDom.querySelectorDeep('button.awsui-button[type="submit"]');// eslint-disable-line no-undef
							return btn;
						}).then(a => a.asElement()))
						.then(btn => {
							return btn.click();
						})
						.then(() => {
							return page.waitForFunction(() => {
								return querySelectorShadowDom.querySelectorDeep('table code').innerHTML;// eslint-disable-line no-undef
							})
								.then(a => a.jsonValue());
						});
				})
				.then(jsonString => {
					return browser.close().then(() => {
						const parsed = JSON.parse(jsonString);
						return parsed[0];
					});
				});
		}).then(result => {
			// This is only working for custom task on aws Sagemaker
			// For prebuild task, amazon is adding a key
			// For example for boundingBox, we should do something like {workerId, annotationData: {content : JSON.stringify({boundingBox: result.annotatedResult})}}
			// For now this is not done but it should be studied in depth to make a generic solution
			// and be compatible with all type of sagemaker groundtruth task
			return {workerId, annotationData: {content: JSON.stringify(result)}};
		});
};
