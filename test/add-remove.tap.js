'use strict';

var test = require('tap').test;

test("async listener lifecycle", function (t) {
  t.plan(8);

  var glue = require('../index.js');

  t.ok(glue.createAsyncListener, "can create async listeners");
  var counted = 0;
  var listener = glue.createAsyncListener(
    {
      create : function () { counted++; },
      before : function () {},
      after  : function () {},
      error  : function () {}
    },
    Object.create(null)
  );

  t.ok(glue.addAsyncListener, "can add async listeners");
  t.doesNotThrow(function () {
    listener = glue.addAsyncListener(listener);
  }, "adding does not throw");

  t.ok(listener, "have a listener we can later remove");

  t.ok(glue.removeAsyncListener, "can remove async listeners");
  t.doesNotThrow(function () {
    glue.removeAsyncListener(listener);
  }, "removing does not throw");

  t.doesNotThrow(function () {
    glue.removeAsyncListener(listener);
  }, "failing remove does not throw");

  t.equal(counted, 0, "didn't hit any async functions");
});
