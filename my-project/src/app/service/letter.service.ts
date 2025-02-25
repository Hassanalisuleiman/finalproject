import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LetterService {
  getLetterDetails() {
    throw new Error('Method not implemented.');
  }
  constructor() {}

  getLetterTemplates() {
    return [
      { id: 1, name: 'Passport Request Letter', template: 'passport-request-letter' },
      { id: 2, name: 'Visa Application Letter', template: 'visa-application-letter' },
      // Add more letter types as needed
    ];
  }

  getDefaultCountry() {
    return 'Tanzania';
  }

  getDefaultDate() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  }

}
