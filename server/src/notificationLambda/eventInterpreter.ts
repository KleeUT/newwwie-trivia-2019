import { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { currentQuestionKey, connectionKey } from "./constants";
import { UpdatedQuestion, QuestionDynamoImage } from "./interfaces";

enum EventType {
  QUESTION_CHANGE,
  NEW_CONNECTION,
  OTHER
}
const determineEventType = (event: DynamoDBStreamEvent): EventType => {
  if (
    event.Records.some(
      record => record.eventName === "MODIFY" && isCurrentQuestionDynamoKey
    )
  ) {
    return EventType.QUESTION_CHANGE;
  }
  if (
    event.Records.some(
      record =>
        record.eventName === "INSERT" &&
        record?.dynamodb?.Keys?.kid?.S === connectionKey
    )
  ) {
    return EventType.NEW_CONNECTION;
  }
  return EventType.OTHER;
};

const isCurrentQuestionDynamoKey = (record: DynamoDBRecord): boolean =>
  !!(
    record.dynamodb &&
    record.dynamodb.Keys &&
    record.dynamodb.Keys.kid &&
    record.dynamodb.Keys.kid.S &&
    record.dynamodb.Keys.kid.S === currentQuestionKey
  );

export const isItAQuestionUpdateEvent = (event: DynamoDBStreamEvent): boolean =>
  determineEventType(event) == EventType.QUESTION_CHANGE;

export const itIsANewConnectionEvent = (event: DynamoDBStreamEvent): boolean =>
  determineEventType(event) === EventType.NEW_CONNECTION;

export const getNewQuestionInfoFrom = (
  event: DynamoDBStreamEvent
): UpdatedQuestion => {
  const questionUpdateRecord = <QuestionDynamoImage>(
    (<unknown>(
      (((event.Records.find(isCurrentQuestionDynamoKey) || {}).dynamodb || {})
        .NewImage || {})
    ))
  );
  return {
    round: Number(questionUpdateRecord.round.S),
    question: Number(questionUpdateRecord.question.S),
    break: questionUpdateRecord.break.BOOL
  };
};
