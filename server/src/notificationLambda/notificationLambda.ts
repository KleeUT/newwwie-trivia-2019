import { DynamoDBStreamEvent, Context } from "aws-lambda";
import { ApiGatewayManagementApi, DynamoDB } from "aws-sdk";
import { configProvider, Config } from "../configProvider";
import {
  isItAQuestionUpdateEvent,
  getNewQuestionInfoFrom,
  itIsANewConnectionEvent
} from "./eventInterpreter";
import {
  currentQuestionKey,
  region,
  connectionKey,
  connectionPrefix,
  questionKey
} from "./constants";
import { UpdatedQuestion, UserFacingQuetion } from "./interfaces";
import { repository, Repository } from "./repository";
import { notifyNewConnection } from "./notifyNewConnection";
const config = configProvider();

const manApi = new ApiGatewayManagementApi({
  apiVersion: "2018-11-29",
  endpoint: config.apiGatewayUri
});

export const handler = async (event: DynamoDBStreamEvent, context: Context) => {
  const repo = repository(config);

  try {
    if (isItAQuestionUpdateEvent(event)) {
      return handleQuestionUpdate(event, repo);
    }
    if (itIsANewConnectionEvent(event)) {
      const connectionRecord = event.Records.find(
        record => record?.dynamodb?.Keys?.kid?.S === connectionKey
      )?.dynamodb?.Keys?.sk?.S;
      const connectionId = connectionRecord?.substr(
        connectionPrefix.length,
        connectionRecord?.length
      );
      return notifyNewConnection(manApi, connectionId || "", repo);
    }

    return "done";
  } catch (err) {
    console.error("Something went wrong", err);
    return err;
  }
};

const handleQuestionUpdate = async (
  event: DynamoDBStreamEvent,
  repo: Repository
) => {
  const activeConnectionsPromise = repo.allActiveConnections();
  const newQuestion = getNewQuestionInfoFrom(event);
  const userFacingQuestionPromise = repo.getQuestion(newQuestion);

  const userFacingQuestion = await userFacingQuestionPromise;

  const existingConnections = await activeConnectionsPromise;

  const sendPromises = existingConnections.map(connection => {
    const params: ApiGatewayManagementApi.PostToConnectionRequest = {
      ConnectionId: connection || "",
      Data: JSON.stringify(userFacingQuestion)
    };
    console.log(
      `attempting to send welcome message to ${connection}, with api url ${config.apiGatewayUri}`
    );
    return manApi
      .postToConnection(params)
      .promise()
      .then(response => console.log(`done sending to ${connection}`, response))
      .catch(err => {
        console.log(`Couldnt send to connection ${connection}`, err);
        repo.removeConnection(connection);
      });
  });
  console.log(`Waiting for ${existingConnections.length} functions to finish`);
  await Promise.all(sendPromises);
  console.log("Done");
  return "HAPPY DAYS";
};

// const removeConnectionOnFailure = async (
//   config: Config,
//   connectionId: string,
//   db: DynamoDB
// ): Promise<void> => {
//   try {
//     await db
//       .deleteItem({
//         TableName: config.tableName,
//         Key: {
//           kid: { S: connectionKey },
//           sk: { S: `${connectionPrefix}${connectionId}` }
//         }
//       })
//       .promise();
//     console.log(`Removed connection ${connectionId}`);
//     // const ret = await axios(url);
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
// };

// const getQuestion = async (
//   config: Config,
//   question: UpdatedQuestion,
//   db: DynamoDB
// ): Promise<UserFacingQuetion> => {
//   if (question.break) {
//     return {
//       title: "Break",
//       body: "",
//       break: question.break
//     };
//   }

//   const item = await db
//     .getItem({
//       TableName: config.tableName,
//       Key: {
//         kid: { S: questionKey },
//         sk: { S: `r${question.round}:q${question.question}` }
//       }
//     })
//     .promise();
//   console.log("Question Item", item);

//   return {
//     title: `Round: ${question.round} Question: ${question.question}`,
//     body: (item.Item || {}).markdown.S || "",
//     break: false
//   };
// };

// const allActiveConnections = async (
//   config: Config,
//   db: DynamoDB
// ): Promise<string[]> => {
//   const dynamoResponse = await db
//     .query({
//       TableName: config.tableName,
//       KeyConditions: {
//         kid: {
//           ComparisonOperator: "EQ",
//           AttributeValueList: [{ S: connectionKey }]
//         },
//         sk: {
//           ComparisonOperator: "BEGINS_WITH",
//           AttributeValueList: [{ S: connectionPrefix }]
//         }
//       }
//     })
//     .promise();
//   // console.log(dynamoResponse.Items);
//   if (dynamoResponse.Items === undefined) {
//     return [];
//   }
//   return dynamoResponse.Items.map(item => {
//     const str = (item.sk || {}).S || connectionPrefix;
//     return str.substr(connectionPrefix.length, str.length);
//   });
// };
