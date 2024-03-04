process.on('message', (data) => {
  let result = {};
  data.map((eachDetail) => {
    return (result[eachDetail.eventId.toString()] =
      eachDetail?.totalEventAmount);
  });
  process.send(result);
});