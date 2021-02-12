import AWS from 'aws-sdk';

const isOffline = process.env.IS_OFFLINE;

const offlineOptions: AWS.DynamoDB.ClientConfiguration = {
  region: 'localhost',
  endpoint: 'http://localhost:8000',
};

export default {
  docClient: isOffline
    ? new AWS.DynamoDB.DocumentClient(offlineOptions)
    : new AWS.DynamoDB.DocumentClient(),
  rawClient: isOffline ? new AWS.DynamoDB(offlineOptions) : new AWS.DynamoDB(),
};
