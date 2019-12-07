import { DynamoDBStreamEvent, Context } from 'aws-lambda'
import fetch from 'node-fetch';
import { ApiGatewayManagementApi, DynamoDB } from 'aws-sdk'
import { connect } from 'http2';
// const axios = require('axios')
// const url = 'http://checkip.amazonaws.com/';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */
const apiId = "cydrqavlhh"
const region = 'ap-southeast-2';
const stage = "deploytest";
const currentQuestionKey = "currentQuestion";
const connectionPrefix = "connection:";
const endpointApi = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}`;

const extractNewConnections = (event: DynamoDBStreamEvent): string[] => event.Records.map(record => {
  if (record.eventName === "INSERT" &&
    record.dynamodb &&
    record.dynamodb.Keys &&
    record.dynamodb.Keys.kid &&
    record.dynamodb.Keys.kid.S &&
    record.dynamodb.Keys.kid.S.startsWith(connectionPrefix)) {
    const id = record.dynamodb.Keys.kid.S.substr(connectionPrefix.length, record.dynamodb.Keys.kid.S.length);
    console.log(`Adding ${id}`)
    return id;
  }
  return undefined;
}).filter(record => record !== undefined) as string[]

const isItAQuestionUpdateEvent = (event: DynamoDBStreamEvent): boolean =>
  event.Records.some(record => record.eventName === "MODIFY" &&
    record.dynamodb &&
    record.dynamodb.Keys &&
    record.dynamodb.Keys.kid &&
    record.dynamodb.Keys.kid.S &&
    record.dynamodb.Keys.kid.S === currentQuestionKey
  )


export const handler = async (event: DynamoDBStreamEvent, context: Context) => {
  try {
    console.log("EVENT:", event)
    console.log("JOSN EVENT:", JSON.stringify(event))
    console.log("CONTEXT:", context)
    const existingConnections = await allActiveConnections();
    console.log('connections,', existingConnections)
    const newConnections = extractNewConnections(event);
    if (newConnections.length === 0) {
      console.log("No records found")
      return "done";
    }
    // const connectionId = 'DpmkcdIrywMAbNQ='

    // const connectionsUrl = `${endpointApi}/@connections`;
    // const withId = `${connectionsUrl}/${connectionId}`;

    const manApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: endpointApi
    });

    const sendPromises = newConnections.map(connection => {
      const params: ApiGatewayManagementApi.PostToConnectionRequest = {
        ConnectionId: connection || "",
        Data: JSON.stringify({ some: `Welcome ${connection}` })
      }
      console.log(`attempting to send welcome message to ${connection}, with api url ${endpointApi}`)
      return manApi.postToConnection(params).promise();
      // return fetch(withId).then(result => {
      //     console.log(result.status)
      //     return result.json();
      // }).then(jsonResponse => {
      //     console.log(jsonResponse)
      // })
    })
    console.log(`Waiting for ${newConnections.length} functions to finish`)
    await Promise.all(sendPromises);
    console.log("Done")
    return "HAPPY DAYS"
  } catch (err) {
    console.error("Something went wrong", err)
    return err;
  }
  // return proms
  //   .then(data => console.log(data))
  //   .then(() => {
  //     try {
  //       // const ret = await axios(url);
  //       let response = {
  //         'statusCode': 200,
  //         'body': JSON.stringify({
  //           message: 'hello world',
  //           // location: ret.data.trim()
  //         })
  //       }
  //       return response
  //     } catch (err) {
  //       console.log(err);
  //       return err;
  //     }
  //   })

};


const allActiveConnections = async () => {
  const TableName = process.env.DYNAMO_TABLE || "";
  const db = new DynamoDB({
    region: 'ap-southeast-2'
  });
  const dynamoResponse = await db.query({
    TableName,
    KeyConditions: {
      kid: {
        ComparisonOperator: "EQ",
        AttributeValueList: [
          { S: 'connection' }
        ]
      },
      sk: {
        ComparisonOperator: "BEGINS_WITH",
        AttributeValueList: [
          { S: connectionPrefix }
        ]
      }
    }
    // KeyConditionExpression: `begins_with(sk, :connectionPrefix)`,
    // ExpressionAttributeNames: { ":connectionPrefix": connectionPrefix }
  }).promise();
  console.log(dynamoResponse.Items);
  return dynamoResponse.Items;
}
