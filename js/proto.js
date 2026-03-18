/**
 * ProtoHelper — protobuf utilities for GRAB level files
 * Requires protobuf.js to be loaded from CDN before this script.
 */
(function () {
  'use strict';

  let _Level = null;

  /**
   * Loads proto/level.proto and returns the Level message type.
   * Caches the result so subsequent calls are instant.
   */
  async function loadProto() {
    if (_Level) return _Level;

    const root = await protobuf.load(getProtoPath());
    _Level = root.lookupType('COD.Level.Level');
    return _Level;
  }

  /**
   * Resolves the path to the proto file relative to the current page.
   */
  function getProtoPath() {
    // If we're in /pages/, go up one level
    const path = window.location.pathname;
    if (path.includes('/pages/')) {
      return '../proto/level.proto';
    }
    return 'proto/level.proto';
  }

  /**
   * Decodes a Level from an ArrayBuffer.
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Object} decoded Level object
   */
  async function decodeLevel(arrayBuffer) {
    const Level = await loadProto();
    const uint8 = new Uint8Array(arrayBuffer);
    return Level.decode(uint8);
  }

  /**
   * Encodes a Level object to a Uint8Array.
   * @param {Object} levelObj
   * @returns {Uint8Array}
   */
  async function encodeLevel(levelObj) {
    const Level = await loadProto();
    const errMsg = Level.verify(levelObj);
    if (errMsg) throw new Error('Level verification failed: ' + errMsg);
    const message = Level.create(levelObj);
    return Level.encode(message).finish();
  }

  window.ProtoHelper = {
    loadProto,
    decodeLevel,
    encodeLevel
  };
})();
