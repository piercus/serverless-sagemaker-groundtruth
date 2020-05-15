const BbPromise = require('bluebird');
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

module.exports = function ({
	page,
	manifestRow,
	workerId
}) {
	// We draw 5 boxes for each worker
	const nBoxes = 5;

	// Cat and Dog
	const nCategories = 2;

	// Using the technic from https://github.com/puppeteer/puppeteer/issues/858#issuecomment-438540596 to select the node
	return page.evaluateHandle('document.querySelector("body > crowd-form > form > crowd-bounding-box").shadowRoot.querySelector("#annotation-area-container > div > div > div")')
		.then(imageCanvas => {
			return imageCanvas.boundingBox();
		}).then(boundingBox => {
			// Define a random bounding box over the image canvas using hasard library
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
				category: h.integer(0, nCategories - 1)
			});

			const workerAnnotations = randomAnnotation.run(nBoxes);

			return BbPromise.map(workerAnnotations, ({box, category}) => {
				return page.evaluateHandle(`document.querySelector("body > crowd-form > form > crowd-bounding-box").shadowRoot.querySelector("#react-mount-point > div > div > awsui-app-layout > div > div.awsui-app-layout__tools.awsui-app-layout--open > aside > div > span > div > div.label-pane-content > div:nth-child(${category + 1})")`)
					.then(categoryButton => categoryButton.click())
					.then(() => page.mouse.move(box[0], box[1]))
					.then(() => page.mouse.down())
					.then(() => page.mouse.move(box[0] + box[2], box[1] + box[3]))
					.then(() => page.mouse.up());
			}, {concurrency: 1});
		}).then(() => {
			console.log(`${workerId} actions simulation done on ${JSON.stringify(manifestRow)}`);
			// At the end we return nothing, serverless-sagemaker-groundtruth will automatically request the output from the page
		});
};
