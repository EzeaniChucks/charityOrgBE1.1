import mongoose from 'mongoose';

export const subscriptionsSchema = new mongoose.Schema({
    sub_name: { type: String },
    sub_currency: { type: String, required: true },
    sub_amount: { type: Number, required: true },
    subscribers:[{
        userId: {type: mongoose.Schema.Types.ObjectId},
        userName:{type:String},
        expiration:Date, //full date string
        subscriptionHistory:[Date]
    }],
    sub_duration_MS:Number, //ub_duration should be an isolated number of miliseconds. Something to add to new user subs.
});

//to check user subscription, just create an endpoint with sub name and userid as parameter
//find the relevant object within subscribers array. Use it to return true or false as regard user subscription
