import mongoose from 'mongoose'
const connectToDatabase = async()=>{
    console.log(process.env.DB_CONNECTION);
    await mongoose.connect(process.env.DB_CONNECTION);
}
const disconnectFromDatabase = async()=>{
    await mongoose.disconnect();
}

process.on('message',async(data)=>{
    try{
        await connectToDatabase()
        const recur = mongoose.model('recurrentPayment');
         const result = await recur.find({
           renewalDateString: {
             $lte: new Date(),
           },
           frequencyfactor: {
             $gt: 0,
           },
         });
         console.log(result)
        process.send('working')
        disconnectFromDatabase()
    }catch(err){

    }
})