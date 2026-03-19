declare module 'express-validator' {
  type ValidationChain = any;
  export function body(...args: any[]): ValidationChain;
  export function check(...args: any[]): ValidationChain;
  export function param(...args: any[]): ValidationChain;
  export function query(...args: any[]): ValidationChain;
  export function oneOf(...args: any[]): ValidationChain;
  export function matchedData(...args: any[]): any;
  export function validationResult(req: any): { isEmpty: () => boolean; array: () => any[] };
  export const sanitizeBody: any;
  export const header: any;
}
