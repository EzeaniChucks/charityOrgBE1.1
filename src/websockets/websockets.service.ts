import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Model } from 'mongoose';

@WebSocketGateway({
  namespace: 'eventchats',
  cors: {
    origin: ['http://localhost:3000', 'https://charityorg.vercel.app'],
  },
})
export class WebsocketsService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(@InjectModel('eventChats') private eventChats: Model<any>) {}

  @WebSocketServer() private server: any;
  private connections = {};
  users: number = 0;

  handleConnection(client: any, ...args: any[]) {
    const userId = client.id;
    console.log(userId);
    if (this.connections[userId]) {
      //check if user is already connected
      console.log(
        `User ${userId} already connected. Closing previous connection`,
      );
      this.connections[userId].close();
      delete this.connections[userId];
    } else {
      console.log(this.connections);
      this.connections[userId] = client.id;
      this.users++;
    }
    // console.log('USER CONNECTED: ', this.users);
  }

  handleDisconnect(client) {
    const userId = client.id;
    delete this.connections[userId];
    this.users--;
    // this.users--;
    // console.log('USER Disconnected: ', this.users);
  }

  @SubscribeMessage('join_room')
  async handleRoom(@ConnectedSocket() socket, @MessageBody() data: any) {
    console.log(data);
    let room = '';
    let allUsers = [];
    let createdAt = Date.now();
    console.log(`This user ${socket.id} is live`);
    console.log(`This user ${this.server.id} is live`);
    if (!(socket._events.join_room.length > 2)) {
      // if ('join_room' in socket._events) {
      // console.log(socket._events);
      const { username, eventId, userId } = data;

      room = eventId;
      socket.join(room);

      allUsers.push({ id: `${socket.id}`, username, room });
      let chatroomUsers = allUsers.filter((user: any) => user.room === room);

      //send to others in room
      socket.to(room).emit('chatroom_users', chatroomUsers); // To all other group users
      //send to room user only
      socket.emit('chatroom_users', chatroomUsers); //To user alone
      socket.on('disconnect', function () {
        console.log(`This user ${socket.id} disconnected`);
        socket.to(room).emit('receive_message', {
          message: `Someone has left the chat room`,
        });
      });
    }
  }

  @SubscribeMessage('send_message')
  async sendMessage(@ConnectedSocket() socket, @MessageBody() data: any) {
    console.log('it reached here');
    if (!(socket._events.send_message.length > 1)) {
      const { eventId, userId, username, messages_sent } = data;
      let room = eventId;
      let createdAt = Date.now();
      let chats = await this.eventChats.findOneAndUpdate(
        { eventId },
        {
          $push: {
            event: {
              userId,
              username,
              message: messages_sent,
            },
          },
        },
        { new: true },
      );
      if (!chats) {
        chats = await this.eventChats.create({
          eventId,
          event: [
            {
              userId,
              username: data.username,
              message: data.messages_sent,
            },
          ],
        });
      }
      console.log(chats);
      socket.to(room).emit('receive_message', {
        message: `${username} has joined the chat room`,
        chatArray: chats,
        username,
        createdAt,
      }); // To all other group users

      socket.emit('receive_message', {
        message: `Welcome to the chatroom, ${username}`,
        chatArray: chats,
        username,
        createdAt,
      }); //To user alone
    }
  }

  @SubscribeMessage('typing')
  async typing() {}
}
