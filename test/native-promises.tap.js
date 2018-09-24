if (!global.Promise) return;

var test = require('tap').test;
var glue = require('../index.js');

test('then', function(t) {
  var listener = addListner();

  var promise = new Promise(function(resolve, reject) {
    listener.currentName = 'resolve';
    resolve(10);
  });

  listener.currentName = 'first then';
  promise.then(function(val) {
    listener.currentName = 'first then continuation';
    t.strictEqual(val, 10);
  });

  listener.currentName = 'setImmediate in root';
  setImmediate(function() {
    listener.currentName = 'second then';
    promise.then(function(val) {
      t.strictEqual(val, 10);
      t.strictEqual(this, global);
      listener.currentName = '2nd then continuation';
      t.deepEqual(listener.root, expected);
      t.end();
    });
  });

  glue.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'first then',
        children: [],
        before: 1,
        after: 1,
        error: 0
      },
      {
        name: 'setImmediate in root',
        children: [
          {
            name: 'second then',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }
        ],
        before: 1,
        after: 1,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  }
});

test('catch', function(t) {
  var listener = addListner();

  var promise = new Promise(function(resolve, reject) {
    listener.currentName = 'reject';
    reject(15);
  });

  listener.currentName = 'catch';
  promise.catch(function(val) {
    listener.currentName = 'catch continuation';
    t.strictEqual(val, 15);
  });

  listener.currentName = 'setImmediate in root';
  setImmediate(function() {
    listener.currentName = 'then';
    promise.then(
      function fullfilled() {
        throw new Error('should not be called on reject');
      },
      function rejected(val) {
        t.strictEqual(val, 15);
        t.strictEqual(this, global);
        listener.currentName = 'then continuation';
        // t.deepEqual(listener.root, expected);
        t.deepEqual(JSON.stringify(listener.root), JSON.stringify(expected));
        t.end();
      }
    )
  });

  glue.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'catch',
        children: [],
        before: 1,
        after: 1,
        error: 0
      },
      {
        name: 'setImmediate in root',
        children: [
          {
            name: 'then',
            children: [],
            before: 0,
            after: 0,
            error: 0
          },
          {
            name: 'then',
            children: [],
            before: 1,
            after: 0,
            error: 0
          }
        ],
        before: 1,
        after: 1,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  };
});

test('throw in executor', function(t) {
  var listener = addListner();

  var promise = new Promise(function unsafe() {
    listener.currentName = 'throw';
    throw 10;
  });

  listener.currentName = 'catch';
  promise.catch(function(val) {
    t.equal(val, 10, 'should match thrown value')
    if (listener.root.children.length === 2) {
      expected.children.splice(1, 0, {
        name: 'catch',
        children: [],
        before: 1,
        after: 0,
        error: 0
      })
    }

    t.deepEqual(listener.root, expected);
    t.end();
  });

  glue.removeAsyncListener(listener.listener);

  var expected = {
    name: 'root',
    children: [
      {
        name: 'catch',
        children: [
        ],
        before: 1,
        after: 0,
        error: 0
      }
    ],
    before: 0,
    after: 0,
    error: 0
  }
});

// In Node.js v6 (and possibly v4), Promise.prototype.chain is merely an alias
// for Promise.prototype.then. In Node.js v7+, it has been completely removed.
if (typeof Promise.prototype.chain === 'function') {
  test('chain', function(t) {
    var listener = addListner();
  
    var promise = new Promise(function(resolve, reject) {
      listener.currentName = 'resolve';
      resolve(10);
    });
  
    listener.currentName = 'first chain';
    promise.chain(function(val) {
      listener.currentName = 'first chain continuation';
      t.strictEqual(val, 10);
    });
  
    listener.currentName = 'setImmediate in root';
    setImmediate(function() {
      listener.currentName = 'second chain';
      promise.chain(function(val) {
        t.strictEqual(val, 10);
        t.strictEqual(this, global);
        listener.currentName = '2nd chain continuation';
        t.deepEqual(listener.root, expected);
        t.end();
      });
    });
  
    glue.removeAsyncListener(listener.listener);
  
    var expected = {
      name: 'root',
      children: [
        {
          name: 'first chain',
          children: [],
          before: 1,
          after: 1,
          error: 0
        },
        {
          name: 'setImmediate in root',
          children: [
            {
              name: 'second chain',
              children: [],
              before: 1,
              after: 0,
              error: 0
            }
          ],
          before: 1,
          after: 1,
          error: 0
        }
      ],
      before: 0,
      after: 0,
      error: 0
    }
  });
}

function addListner() {
  var listener = glue.addAsyncListener({
    create: create,
    before: before,
    after: after,
    error: error
  });


  var state = {
    listener: listener,
    currentName: 'root'
  };

  state.root = create();
  state.current = state.root;

  return state;

  function create () {
    var node = {
      name: state.currentName,
      children: [],
      before: 0,
      after: 0,
      error: 0
    };

    if(state.current) state.current.children.push(node);
    return node;
  }

  function before(ctx, node) {
    state.current = node;
    state.current.before++;
  }

  function after(ctx, node) {
    node.after++;
    state.current = null;
  }

  function error(ctx, node) {
    node.error++;
    state.current = null;
    return false;
  }
}
