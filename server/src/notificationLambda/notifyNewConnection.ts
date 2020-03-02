import { DynamoDB, ApiGatewayManagementApi } from "aws-sdk";
import { Config } from "../configProvider";
import { currentQuestionKey, questionKey } from "./constants";
import { Repository } from "./repository";
export const notifyNewConnection = async (
  manApi: ApiGatewayManagementApi,
  connectionId: string,
  repo: Repository
) => {
  console.log("About to get the current question");
  const currentQuestionRecord = await repo.getCurrentQuestion();
  console.log("currentQuestionRecord", currentQuestionRecord);
  const userFacingQuestion = await repo.getQuestion(currentQuestionRecord);
  await manApi
    .postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(userFacingQuestion)
    })
    .promise();
  console.log(`Done sending to new connection ${connectionId}`);
  // const questionRecord = db.getItem({
  //   TableName: config.tableName,
  //   Key: {
  //     kid: { S: questionKey },
  //     sk: {
  //       S: `r${currentQuestionRecord.Item?.round?.S}:q${currentQuestionRecord?.Item?.question?.S}`
  //     }
  //   }
  // });
};
