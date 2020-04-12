'use strict';

const uuidv1 = require('uuid/v1');
const AWS = require('aws-sdk');

var sqs = new AWS.SQS({ region: process.env.REGION });
const QUEUE_URL = process.env.PENDING_ORDER_QUEUE;
const orderMetadataManager = require('./orderMetadataManager');

module.exports.hacerPedido = (event, context, callback) => {
  console.log('Hacer pedido fue llamado ')
  const body = JSON.parse(event.body);
  const order = {
		orderId: uuidv1(),
		name: body.name,
		address: body.address,
		pizzas: body.pizzas,
    timestamp: Date.now()
	};
  const params = {
		MessageBody: JSON.stringify({ order: order }),
		QueueUrl: QUEUE_URL
	};
  sqs.sendMessage(params, function(err, data) {
		if (err) {
			sendResponse(500, err, callback);
		} else {
			const message = {
				order: order,
				messageId: data.MessageId
			};
			sendResponse(200, message, callback);
		}
	});
};


module.exports.prepararPedido = (event, context, callback) => {
	console.log('Preparar pedido fue llamada');
  console.log(event);
  const order = JSON.parse(event.Records[0].body);
    console.log(order.order);
  orderMetadataManager
		.saveCompletedOrder(order.order)
		.then(data => {
			callback();
		})
		.catch(error => {
			callback(error);
		});
};

module.exports.enviarPedido = (event, context, callback) => {
  console.log('enviarPedido fue llamada');
  console.log(event);
	const record = event.Records[0];
  console.log(record);
  if (record.eventName === 'INSERT') {
		console.log('deliverOrder');

		const orderId = record.dynamodb.Keys.orderId.S;

		orderMetadataManager
			.deliverOrder(orderId)
			.then(data => {
				console.log(data);
				callback();
			})
			.catch(error => {
				callback(error);
			});
	} else {
		console.log('is not a new record');
		callback();
	}
};
function sendResponse(statusCode, message, callback) {
	const response = {
		statusCode: statusCode,
		body: JSON.stringify(message)
	};
	callback(null, response);
}
