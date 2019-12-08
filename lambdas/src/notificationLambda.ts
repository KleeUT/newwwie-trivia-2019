import { DynamoDBStreamEvent, Context, DynamoDBRecord } from 'aws-lambda'
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
const connectionKey = 'connection'
const endpointApi = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}`;

interface QuestionDynamoImage {
  "question": {
    "S": string
  },
  "round": {
    "S": string
  },
  "break": {
    "BOOL": boolean
  },
  "kid": {
    "S": string
  },
  "sk": {
    "S": string
  }
}

interface UpdatedQuestion { round: Number, question: Number, break: Boolean }

const isCurrentQuestionDynamoKey = (record: DynamoDBRecord): boolean => !!(record.dynamodb &&
  record.dynamodb.Keys &&
  record.dynamodb.Keys.kid &&
  record.dynamodb.Keys.kid.S &&
  record.dynamodb.Keys.kid.S === currentQuestionKey)

const isItAQuestionUpdateEvent = (event: DynamoDBStreamEvent): boolean =>
  event.Records.some(record => record.eventName === "MODIFY" &&
    isCurrentQuestionDynamoKey
  )

const getNewQuestionInfoFrom = (event: DynamoDBStreamEvent): UpdatedQuestion => {
  const questionUpdateRecord = <QuestionDynamoImage><unknown>(((event.Records.find(isCurrentQuestionDynamoKey) || {}).dynamodb || {}).NewImage || {});

  return {
    round: Number(questionUpdateRecord.round.S),
    question: Number(questionUpdateRecord.question.S),
    break: questionUpdateRecord.break.BOOL
  }
}

export const handler = async (event: DynamoDBStreamEvent, context: Context) => {
  try {
    // console.log("JOSN EVENT:", JSON.stringify(event))
    if (!isItAQuestionUpdateEvent(event)) {
      return "done";
    }
    const activeConnectionsPromise = allActiveConnections();
    const newQuestion = getNewQuestionInfoFrom(event);
    const userFacingQuetionPromise = getQuestion(newQuestion);
    console.log("New Question:", newQuestion)

    const manApi = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: endpointApi
    });



    const userFacingQuetion = await userFacingQuetionPromise;
    console.log("userFacingQuetion", userFacingQuetion);

    const existingConnections = await activeConnectionsPromise;
    console.log('connections,', existingConnections)




    const sendPromises = existingConnections.map(connection => {
      const params: ApiGatewayManagementApi.PostToConnectionRequest = {
        ConnectionId: connection || "",
        Data: JSON.stringify(userFacingQuetion)
      }
      console.log(`attempting to send welcome message to ${connection}, with api url ${endpointApi}`)
      return manApi.postToConnection(params).promise().catch((err) => {
        console.log(`Couldnt send to connection ${connection}`, err)
      });
    })
    console.log(`Waiting for ${existingConnections.length} functions to finish`)
    await Promise.all(sendPromises);
    console.log("Done")
    return "HAPPY DAYS"
  } catch (err) {
    console.error("Something went wrong", err)
    return err;
  }

};

interface UserFacingQuetion {
  title: String
  body: String
  break: Boolean
}

const getQuestion = async (question: UpdatedQuestion): Promise<UserFacingQuetion> => {
  if (question.break) {
    return {
      title: "Break",
      body: "",
      break: question.break
    }
  }
  const TableName = process.env.DYNAMO_TABLE || "";
  const db = new DynamoDB({
    region
  });
  const item = await db.getItem({
    TableName,
    Key: {
      kid: { S: "question" },
      sk: { S: `r${question.round}:q${question.question}` }
    }
  }).promise()
  console.log("Question Item", item);

  return {
    title: `Round ${question.round} Question: ${question.question}`,
    body: (item.Item || {}).markdown.S || "",
    break: false
  }
}

const allActiveConnections = async (): Promise<string[]> => {
  const TableName = process.env.DYNAMO_TABLE || "";
  const db = new DynamoDB({
    region
  });
  const dynamoResponse = await db.query({
    TableName,
    KeyConditions: {
      kid: {
        ComparisonOperator: "EQ",
        AttributeValueList: [
          { S: connectionKey }
        ]
      },
      sk: {
        ComparisonOperator: "BEGINS_WITH",
        AttributeValueList: [
          { S: connectionPrefix }
        ]
      }
    }
  }).promise();
  console.log(dynamoResponse.Items);
  if (dynamoResponse.Items === undefined) {
    return [];
  }
  return dynamoResponse.Items.map(item => {
    const str = ((item.sk || {}).S || connectionPrefix);
    return str.substr(connectionPrefix.length, str.length)
  });
}


[{
  sk: { S: 'connection:EVA2Ne6_ywMCIaA=' },
  kid: { S: 'connection' }
}]