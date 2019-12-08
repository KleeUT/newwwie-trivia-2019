call npm run build
call aws s3 sync .\build\ s3://trivia2019.kleeut.com --delete  