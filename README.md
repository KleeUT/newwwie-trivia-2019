# Trivia Servr
App for Newwwie Trivia 2019. 


This is designed to run as a SAM app on AWS.
It provides a Web Socket API to push changes from the DynamoDB databae to the client with the current question 

## Data
Questions, current question and connections share a DynamoDB table and are split by primary key (`kid`)

## Build and deploy
```bash
sam build
sam package --output-template-file packaged.yaml --s3-bucket kleeut-lambda
sam deploy --template-file .\packaged.yaml --region ap-southeast-2 --capabilities CAPABILITY_IAM newwwie-trivia
