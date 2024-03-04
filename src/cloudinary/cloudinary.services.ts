import { Injectable, NotFoundException } from '@nestjs/common';

import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import toStream = require('buffer-to-stream');

@Injectable()

export class CloudinaryService {
  
  async uploadImage(
    file: any,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream((error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
      // console.log(file)
      toStream(file).pipe(upload);
    });
  }

  async uploadVideo(
    file: any,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const maxFileSize = 1024 * 1024 * 50;
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        { resource_type: 'video', max_bytes: maxFileSize },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      toStream(file).pipe(upload);
    });
  }
  async url(videoPublicId: string, options: any) {
    return v2.url(videoPublicId, options);
  }
  async destroyVideo(videoPublicId: string) {
    const result = await v2.uploader.destroy(
      videoPublicId,
      { resource_type: 'video' },
      (err, result) => {
        if (err) throw new NotFoundException(err);
        return result;
      },
    );
    return result;
  }
  async destroyMultipleVideos(videoPublicIds: string[]) {
    const result = await v2.api.delete_resources(
      videoPublicIds,
      { resource_type: 'video' },
      (err, result) => {
        if (err) throw new NotFoundException(err);
        if (result?.deleted) return result;
        else return { msg: 'Could not delete videos' };
      },
    );
    return result;
  }

  async uploadAudio(
    file: any,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const maxFileSize = 1024 * 1024 * 50;
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        { resource_type: 'video', max_bytes: maxFileSize },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      toStream(file).pipe(upload);
    });
  }
  async urlAudio(audioPublicId: string, options: any) {
    return v2.url(audioPublicId, options);
  }
  async destroyAudio(audioPublicId: string) {
    const result = await v2.uploader.destroy(
      audioPublicId,
      { resource_type: 'video' },
      (err, result) => {
        if (err) throw new NotFoundException(err);
        return result;
      },
    );
    return result;
  }
  async destroyMultipleAudios(audioPublicIds: string[]) {
    const result = await v2.api.delete_resources(
      audioPublicIds,
      { resource_type: 'video' },
      (err, result) => {
        if (err) throw new NotFoundException(err);
        if (result?.deleted) return result;
        else return { msg: 'Could not delete audios' };
      },
    );
    return result;
  }

  async uploadPdf(
    file: any,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const maxFileSize = 1024 * 1024 * 50;
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        { resource_type: 'auto', max_bytes: maxFileSize },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      toStream(file).pipe(upload);
    });
  }
  async urlPdf(uploadDocx_pdfPublicId: string, options: any) {
    return v2.url(uploadDocx_pdfPublicId, options);
  }
  async destroyPdf(uploadDocx_pdfPublicId: string) {
    const result = await v2.uploader.destroy(
      uploadDocx_pdfPublicId,
      { resource_type: 'pdf' },
      (err, result) => {
        if (err) throw new NotFoundException(err);
        return result;
      },
    );
    return result;
  }
  
  async uploadDoc(
    file: any,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const maxFileSize = 1024 * 1024 * 50;
    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        { resource_type: 'auto', max_bytes: maxFileSize },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      toStream(file).pipe(upload);
    });
  }
  async urlDoc(uploadDocx_pdfPublicId: string, options: any) {
    return v2.url(uploadDocx_pdfPublicId, options);
  }
  async destroyDoc(uploadDocx_pdfPublicId: string) {
    const result = await v2.uploader.destroy(
      uploadDocx_pdfPublicId,
      { resource_type: 'auto' },
      (err, result) => {
        if (err) throw new NotFoundException(err);
        return result;
      },
    );
    return result;
  }

}