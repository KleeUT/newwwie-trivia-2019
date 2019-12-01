
sam build
echo ----------build done ------------
sam package --output-template-file packaged.yaml --s3-bucket kleeut-lambda
echo -----------package done ---------------
sam deploy --template-file .\packaged.yaml --region ap-southeast-2 --capabilities CAPABILITY_IAM sam-socket-test
