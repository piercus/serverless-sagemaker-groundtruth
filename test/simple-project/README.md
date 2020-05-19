# Simple project

Example project for serverless-sagemaker-groundtruth

This is an example of a custom Object detection Groundtruth task.

NB: the consolidation function for object detection is based on [mean-average-precision](https://www.npmjs.com/package/mean-average-precision)

## Example command

```
serverless groundtruth test e2e --groundtruthTask basic --manifest ./example.json --workerIds a,b,c --puppeteerModule puppeteer.js
```