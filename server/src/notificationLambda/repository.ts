import { DynamoDB } from "aws-sdk";
import { Config } from "../configProvider";
import {
  region,
  questionKey,
  connectionKey,
  connectionPrefix,
  currentQuestionKey
} from "./constants";
import { UpdatedQuestion, UserFacingQuetion } from "./interfaces";
import { GetItemOutput } from "aws-sdk/clients/dynamodb";
export type Repository = {
  getQuestion: (question: UpdatedQuestion) => Promise<UserFacingQuetion>;
  allActiveConnections: () => Promise<string[]>;
  removeConnection: (connectionId: string) => Promise<void>;
  getCurrentQuestion: () => Promise<UpdatedQuestion>;
};
export const repository = (config: Config): Repository => {
  const db = new DynamoDB({
    region
  });
  const getQuestion = async (
    question: UpdatedQuestion
  ): Promise<UserFacingQuetion> => {
    if (question.break) {
      return {
        title: "Break",
        body: "",
        break: question.break
      };
    }

    const item: GetItemOutput = await db
      .getItem({
        TableName: config.tableName,
        Key: {
          kid: { S: questionKey },
          sk: { S: `r${question.round}:q${question.question}` }
        }
      })
      .promise();
    console.log("Question Item", item);

    return {
      title: `Round: ${question.round} Question: ${question.question}`,
      body:
        item?.Item?.markdown?.S ||
        `Markdown missing for key:${questionKey} r${question.round}:q${question.question}`,
      break: false
    };
  };
  const allActiveConnections = async (): Promise<string[]> => {
    const dynamoResponse = await db
      .query({
        TableName: config.tableName,
        KeyConditions: {
          kid: {
            ComparisonOperator: "EQ",
            AttributeValueList: [{ S: connectionKey }]
          },
          sk: {
            ComparisonOperator: "BEGINS_WITH",
            AttributeValueList: [{ S: connectionPrefix }]
          }
        }
      })
      .promise();
    // console.log(dynamoResponse.Items);
    if (dynamoResponse.Items === undefined) {
      return [];
    }
    return dynamoResponse.Items.map(item => {
      const str = (item.sk || {}).S || connectionPrefix;
      return str.substr(connectionPrefix.length, str.length);
    });
  };

  const removeConnection = async (connectionId: string): Promise<void> => {
    try {
      await db
        .deleteItem({
          TableName: config.tableName,
          Key: {
            kid: { S: connectionKey },
            sk: { S: `${connectionPrefix}${connectionId}` }
          }
        })
        .promise();
      console.log(`Removed connection ${connectionId}`);
      // const ret = await axios(url);
    } catch (err) {
      console.log(err);
      return err;
    }
  };
  const getCurrentQuestion = async (): Promise<UpdatedQuestion> => {
    console.log("getting current question");
    const currentQuestionRecord = await db
      .getItem({
        TableName: config.tableName,
        Key: {
          kid: { S: currentQuestionKey },
          sk: { S: "-" }
        }
      })
      .promise();

    return {
      break: currentQuestionRecord.Item?.break?.BOOL || false,
      round: Number(currentQuestionRecord.Item?.round?.S),
      question: Number(currentQuestionRecord.Item?.question?.S)
    };
  };

  return {
    getQuestion,
    allActiveConnections,
    removeConnection,
    getCurrentQuestion
  };
};
