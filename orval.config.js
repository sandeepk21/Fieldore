module.exports = {
  api: {
    input: 'http://192.168.29.189:5166/swagger/v1/swagger.json',
    output: {
      target: './src/api/generated.ts', // generated API file
      client: 'axios',                  // http client
    },
  },
};