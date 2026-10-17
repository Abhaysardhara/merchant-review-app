const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Firebase dual-package fix for SDK 57.
//
// @firebase/auth's RN bundle is CJS and does require('@firebase/app'),
// which resolves via the "require" export condition to dist/index.cjs.js.
// Meanwhile, firebase/app (ESM wrapper) imports @firebase/app via the
// "default" condition → dist/esm/index.esm2017.js.
//
// Metro treats these as two separate modules, so the auth component is
// registered in one @firebase/app instance but looked up in another →
// "Component auth has not been registered yet".
//
// Fix: force @firebase/app to always resolve to the CJS entry so every
// consumer shares a single module instance.
const firebaseAppCjs = path.resolve(
  __dirname,
  'node_modules/@firebase/app/dist/index.cjs.js',
);

const origResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/app') {
    return { filePath: firebaseAppCjs, type: 'sourceFile' };
  }
  if (origResolveRequest) {
    return origResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
