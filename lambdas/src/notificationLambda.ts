import { DynamoDBStreamEvent, Context } from 'aws-lambda'
import fetch from 'node-fetch';
import {ApiGatewayManagementApi} from 'aws-sdk'
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
const apiId = "0bykmo2vv5"
const region = 'ap-southeast-2';
const stage = "test1";

export const handler = async (event: any, context: Context) => {
    console.log("EVENT:", event)
    console.log("CONTEXT:", context)
    if(!event.connectionId){
        throw {error: "no connectionId on event"}
    }
    // const connectionId = 'DpmkcdIrywMAbNQ='

    const endpointApi = `https://${apiId}.execute-api.${region}.amazonaws.com/${stage}`;
    // const connectionsUrl = `${endpointApi}/@connections`;
    // const withId = `${connectionsUrl}/${connectionId}`;

    const manApi = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: endpointApi
    });

    const params = {
        ConnectionId: event.connectionId, 
        Data: JSON.stringify({some:`data for ${event.connectionId}`})
    }
    const proms = manApi.postToConnection(params).promise();
    // return fetch(withId).then(result => {
    //     console.log(result.status)
    //     return result.json();
    // }).then(jsonResponse => {
    //     console.log(jsonResponse)
    // })
    return proms
    .then(data => console.log(data))
        .then(() => {
            try {
                // const ret = await axios(url);
                let response = {
                    'statusCode': 200,
                    'body': JSON.stringify({
                        message: 'hello world',
                        // location: ret.data.trim()
                    })
                }
                return response
            } catch (err) {
                console.log(err);
                return err;
            }
        })

};
