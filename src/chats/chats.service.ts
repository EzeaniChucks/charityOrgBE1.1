import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.services';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel('eventchats') private eventchats: Model<any>,
    private readonly cloudinaryservice: CloudinaryService,
  ) {}
  // messages: any[] = [{ name: 'Bot', text: 'Welcome to this chatroom' }];
  clientToUser = {};

  async create(createMessageDto: {
    eventId: string;
    userId: string;
    name: string;
    text?: string;
    // file: { data: Buffer; name: string };
    file?: File;
    fileType:string
    fileName:string
  }) {
    let message = { ...createMessageDto };
    const { eventId, userId, name, text, file, fileType, fileName } = createMessageDto;

    // console.log('file', file, 'filetype', fileType);
    const chatExists = await this.eventchats.findOne({ eventId });
    
    if (chatExists?.chats?.length === 1 && chatExists?.chats[0]?.name === 'Bot') {
      if (file) {
        let result:any = {};
        if (fileType?.includes('audio')) {
          // console.log(fileType)
          result = await this.cloudinaryservice.uploadAudio(file);
        } else if (fileType?.includes('video')) {
          result = await this.cloudinaryservice.uploadVideo(file);
        } else if (fileType?.includes('pdf')) {
          result = await this.cloudinaryservice.uploadPdf(file);
        } else if (fileType?.includes('image')) {
          result = await this.cloudinaryservice.uploadImage(file);
        }
        const {
          secure_url,
          playback_url,
          public_id,
          asset_id,
          resource_type,
          format,
        } = result;
        await this.eventchats.findOneAndUpdate(
          { eventId },
          {
            $set: {
              chats: {
                userId,
                name,
                file_details: {
                  filename: fileName,
                  secure_url,
                  public_id,
                  resource_type: fileType?.includes('audio') ? 'audio' : resource_type,
                  format,
                  asset_id,
                  playback_url,
                },
              },
            },
          },
          { new: true },
        );
        message['file_details'] = {
          filename: fileName,
          secure_url,
          resource_type: fileType?.includes('audio') ? 'audio' : resource_type,
          format,
        };
        delete message.file;
      } else {
        await this.eventchats.findOneAndUpdate(
          { eventId },
          { $set: { chats: { userId, name, text } } },
          { new: true },
        );
      }
    } else {
      if (file) {
        let result:any = {};
        if (fileType.includes('audio')) {
          result = await this.cloudinaryservice.uploadAudio(file);
        } else if (fileType.includes('video')) {
          result = await this.cloudinaryservice.uploadVideo(file);
        } else if (fileType.includes('pdf')) {
          result = await this.cloudinaryservice.uploadPdf(file);
        } else if (fileType.includes('image')) {
          result = await this.cloudinaryservice.uploadImage(file);
        }
        const {
          secure_url,
          playback_url,
          public_id,
          asset_id,
          resource_type,
          format,
        } = result;
        await this.eventchats.findOneAndUpdate(
          { eventId },
          {
            $push: {
              chats: {
                userId,
                name,
                file_details: {
                  filename: fileName,
                  secure_url,
                  public_id,
                  resource_type: fileType?.includes('audio')
                    ? 'audio'
                    : resource_type,
                  format,
                  asset_id,
                  playback_url,
                },
              },
            },
          },
          { new: true },
        );
        message['file_details'] = {
          filename: fileName,
          secure_url,
          resource_type: fileType?.includes('audio') ? 'audio' : resource_type,
          format,
        };
        delete message.file;
      } else {
        await this.eventchats.findOneAndUpdate(
          { eventId },
          { $push: { chats: { userId, name, text } } },
          { new: true },
        );
      }
    }
    return message;
  }

  async findAll(eventId: string) {
    const chatExists = await this.eventchats.findOne({ eventId });
    if (chatExists) {
      return chatExists.chats;
    } else {
      let chatObject = await this.eventchats.create({
        eventId,
        chats: [
          {
            name: 'Bot',
            text: 'Welcome to this chatroom. Be the first to leave a message',
          },
        ],
      });
      return chatObject.chats;
    }
    // return this.messages; //select all messages from database
  }

  identify(name: string, userId: string, clientId: string, roomId: string) {
    // console.log(roomId, userId, clientId, name);
    let userExists = false;
    if (this.clientToUser[roomId]) {
      for (let clients in this.clientToUser[roomId]) {
        let clientInfo = this.clientToUser[roomId][clients];
        if (Object.values(clientInfo)[0] === userId) {
          userExists = true;
        }
      }
      if (!userExists) {
        this.clientToUser[roomId] = {
          ...this.clientToUser[roomId],
          [clientId]: { [name]: userId },
        };
      }
    } else {
      this.clientToUser[roomId] = {
        [clientId]: { [name]: userId },
      };
    }
    // console.log(this.clientToUser);
    return Object.values(this.clientToUser[roomId]);
  }

  async getClientName(clientId: string, roomId: string) {
    const userObj = this.clientToUser[roomId]; //check whether roomId is present. Will break break server if not checked
    const userObject = userObj ? userObj[clientId] : {};
    return Object.keys(userObject)[0];
  }

  removeClientFromRoom(clientId: string) {
    let roomId = undefined;
    for (let room in this.clientToUser) {
      for (let clientidentity in this.clientToUser[room]) {
        if (clientidentity === clientId) {
          delete this.clientToUser[room][clientId];
          roomId = room;
        }
      }
      return {
        eventId: roomId,
        newUsers: this.clientToUser[roomId]
          ? Object.values(this.clientToUser[roomId])
          : [],
      };
    }
    return this.clientToUser[clientId];
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} message`;
  // }

  // update(id: number, updateMessageDto: UpdateMessageDto) {
  //   return `This action updates a #${id} message`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} message`;
  // }
}
