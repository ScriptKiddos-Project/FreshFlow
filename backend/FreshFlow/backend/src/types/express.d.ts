// import { Request } from 'express';

// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         id: string;
//         email: string;
//         role: 'vendor' | 'admin';
//         name: string;
//         businessName?: string;
//         isActive: boolean;
//       };
//       file?: Express.Multer.File;
//       files?: Express.Multer.File[];
//     }
//   }
// }

// import { IUserDocument } from '../models/User';

// declare global {
//   namespace Express {
//     // Extend Passport's User interface instead of redeclaring it
//     interface User extends IUserDocument {}

//     interface Request {
//       resourceId?: string;
//       isOwner?: boolean;
//       file?: Express.Multer.File;
//       files?: Express.Multer.File[];
//     }
//   }
// }


import { IUserDocument } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      resourceId?: string;
      isOwner?: boolean;
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
    }
  }
}

export {};