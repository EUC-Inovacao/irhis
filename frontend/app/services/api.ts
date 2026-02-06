// API service is disabled - app now uses local storage only
// This file is kept as a stub to prevent import errors during migration

import axios from "axios";

const api = axios.create({
  baseURL: 'http://localhost:5000', // Dummy URL - will not be used
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Override all methods to throw errors indicating local storage should be used
const throwError = (method: string) => {
  throw new Error(
    `API calls are disabled. This app now uses local storage only. ` +
    `Please use local repositories or services instead of ${method}.`
  );
};

api.get = () => Promise.reject(throwError('api.get'));
api.post = () => Promise.reject(throwError('api.post'));
api.put = () => Promise.reject(throwError('api.put'));
api.delete = () => Promise.reject(throwError('api.delete'));
api.patch = () => Promise.reject(throwError('api.patch'));

// Interceptors are no longer needed
api.interceptors = {
  request: { use: () => {}, eject: () => {} },
  response: { use: () => {}, eject: () => {} },
} as any;

export default api;
