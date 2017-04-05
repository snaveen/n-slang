// # Building slang
// In this series, we will gradually work through implementing an interpreter for
// a small programming language in Javascript.  We'll be working towards a pretty
// powerful feature set, but efficiency will not be one of our initial concerns.
// 
// > **Note**: This file is written in a "stream of thought" style so you can
// > follow along from top to bottom as we add more detail. You can pretty much
// > draw a line at any point in the code, copy paste everything before that line
// > into a javascript console and run it. I say "pretty much" because some
// > concepts and implementations will take a few steps to flesh out, so
// > "pretty much" means "as long as everything you need has been defined".
// We use "harmony" to access ES6 features like `let`.
"use strict";
// ## Application area
// While working through this, we'll keep in mind a simple application of the
// language we'll be building - a drawing tool that works within web browsers. As
// we do more advanced stuff, we'll be going beyond this application area, but
// those transition points will be well defined.
 
// ## Approach
// 
// Normally, when learning a programming language, we learn first about its
// *syntax* - which is how the language looks, then delve a little deeper into its
// *semantics* - which is how the language works and behaves and later on work out
// a *mental model* for the language so we can understand programs in it and use
// the language syntax and semantics for effective system design.
//
// In this series, we'll be going the other way around. We won't bother ourselves
// with pretty syntax, but we'll start with a mental model of programming and work
// out a viable semantics for a language and only then slap a syntax on it purely
// for convenience.
// ## The mental model
// **Program**: Our program will be .. a sequence of instructions we give our
// interpreter to perform. Simple eh? We read instructions one by one and
// "execute" them. This will be how our "interpreter" will work.
// 
// **Environment**: The instructions our program runs will do their job within the
// context of an environment. Making this environment explicit is very useful to
// making multiple runtimes co-exist by creating different environments for them.
// 
// **Stack**: Our programs will operate on a *stack* of values.  Programs will
// have immediate access to the top elements of the stack, but will have to pop
// out elements in order to look any deeper.
// 
// Even with this simple mental model, we've made some dramatic claims. The most
// important of these claims being we will think of our program and the data our
// program will operate on in terms of the same value representation.  This will
// eventually permit us to write programs that can work on our programs.
// ## Values
// We break down our language into the values that our programs work
// with and choose basic data structures for representing our program
// as well as the stack that they operate on.
// 
// So what values will our program need to deal with? If you think about drawing
// applications, at the minimum we need numbers to represent coordinates and
// strings to include text. We're also likely to encounter repeated patterns. So
// we need some ways of giving names to these patterns so we can reuse them. We'll
// also have some operations that we initially won't be able to perform in our
// language and will need to dig into the "host language" - in this case
// Javascript - to perform.  We'll call these "primitives".
 
// We'll represent values of these types using a simple Javascript Object with two
// fields `t` for "type" and `v` for "value".
//
// We can use these functions to make values that our programs can consume.
// By using these functions, we're guaranteeing that we'll supply proper argument
// types so our programs can, for example, trust that the `v` field will be a
// number if the `t` field has the value `"number"`.
let number = function (v)  { return {t: 'number', v: v};  },
    string = function (v)  { return {t: 'string', v: v};  },
    word   = function (v)  { return {t: 'word',   v: v};  },
    prim   = function (fn) { return {t: 'prim',   v: fn}; };
// If you look carefully into what we've done here, we've already committed to
// something pretty big! These are the entities using which we'll be expressing
// the values that our programs will operate on. They are also the entities
// using which we'll express our programs! Though we'll be expanding on this
// set, we'll try and preserve this symmetry as far down the line as makes
// sense for our purpose.
// ## Running a program
// Recall that we said our program is a sequence of instructions we process
// one by one. We can represent our program therefore using a plain old
// Javascript array, along with a "program counter" which is an index into
// the array of instructions to execute next. The stack that our program needs
// to work on can also be represented by an array.
let run = function (env, program, pc, stack) {
    // So how do we run our program? It is just as the Red Queen said to the
    // White Rabbit in Alice in Wonderland - "Start at the beginning, go on
    // until you reach the end, then stop."
    for (; pc < program.length; ++pc) {
        let instr = program[pc];
        // When an instruction is a "word", we need to use it as a key to lookup
        // a value in our environment. Once we look it up, we have to treat it
        // as though this value occurred in our program as a literal, which means
        // treating it as an instruction and processing it.
        if (instr.t === 'word') {
            instr = lookup(env, instr);
        }
        switch (instr.t) {
            // When we encounter a primitive operation given as a Javascript function,
            // we have to pass it our stack so that it can do whatever it needs to do
            // with the values stored on the stack.
            case 'prim':
                stack = apply(instr, stack);
                break;
                
            // In all other cases we just store the value on the stack.
            default:
                push(stack, instr);
                break;
        }
    }
    return stack;
};
// ... and that's it for our first interpreter!
// ## Looking up words and performing primitive operations
// Since our simple idea of an environment is as a key-value lookup table,
// we use a plain Javascript object as our environment. We'll capture this
// assumption in a function to create a new environment from scratch.
let mk_env = function () {
    return {}; // A new hash map for key-value associations.
};
// With such an "environment", we get a simple lookup function -
let lookup = function (env, word) {
    return env[word.v];
};
// Associate the value with the given key and returns the environment.
let define = function (env, key, value) {
    env[key] = value;
    return env;
};
// For generality, we can model primitive operations as functions on our
// stack. 
let apply = function (prim, stack) {
    return prim.v(stack);
};
// > Question: What limitations does this definition impose on
// > what a primitive function can do?
// We'll also abstract the stack operations to keep things flexible.
let push = function (stack, item) {
    stack.push(item);
    return stack;
};
let pop = function (stack) {
    return stack.pop();
};
let topitem = function (stack) {
    return stack[stack.length - 1];
};
// It is useful to look a little deeper into the stack.
// So we add another function to peek deeper than the topmost
// element.
let topi = function (stack, i) {
    return stack[stack.length - 1 - i];
};
let depth = function (stack) {
    return stack.length;
};
// For simplicity, we assume that our primitives do not throw exceptions.
// In fact, we will not bother with exceptions at all. Forget that they were
// even mentioned here!
// ### Testing our mini language
// Let's quickly write a few functions to express how we intend to run
// our programs and what we'll expect of them.
// We'll hold all our tests in a single hash table mapping the test
// name to the test function to be called.
let tests = {};
// The smoke_test function should produce a stack with a single item
// on it - the number 3.
tests.smoke = function () {
    // We start with an empty environment, load our standard library of
    // routines into it and use it to run our "program" that adds 1 and 2
    // and returns the stack with the result.
    let env = load_stdlib(mk_env());
    
    let program = [
        number(1),      // Push 1 on to the stack
        number(2),      // Push 2 on to the stack
        word('+')       // Apply '+' operation on top two elements.
    ];
    return run(env, program, 0, []);
};
// ### Displaying the stack for debugging
// A helper function to show the top n elements of the stack on the console.
// The count defaults to 20.
let show = function (stack, n) {
    n = Math.min(n || 20, depth(stack)); // Default to 20 elements.
    for (let i = 0; i < n; ++i) {
        show_item(topi(stack, i));
    }
};
let show_item = function (item) {
    switch (item.t) {
        case 'string':
            // We need to properly escape characters, so we use stringify only for strings.
            return console.log('string(' + JSON.stringify(item.v) + ')');
        default:
            // Everything else, we let the default display routine take over.
            return console.log(item.t + '(' + item.v + ')');
    }
};
// ## Standard library
// We'll choose a very basic standard library consisting of 4 arithmetic
// operations to start with. We'll expand this set, but we're too impatient
// to get to try out our new fangled "language" that we're willing to wait
// for that coolness.
let load_stdlib = function (env) {
    
    // Basic arithmetic operators for starters.
    // Note the order in which the arguments are retrieved.
    define(env, '+', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v + y.v));
    }));
    define(env, '-', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v - y.v));
    }));
    define(env, '*', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v * y.v));
    }));
    define(env, '/', prim(function (stack) {
        let y = pop(stack), x = pop(stack);
        return push(stack, number(x.v / y.v));
    }));
    return env;
};
// ### Test distance calculation
// To calculate the distance between two points on a 2D plane,
// we need a new primitive - the square root function.
// First, a small utility to add new definitions to our 
// `load_stdlib` function. `new_defns` is expected to be
// a function that takes an environment, defines some things
// into it and returns the environment.
let stddefs = function (new_defns) {
    load_stdlib = (function (load_first) {
        return function (env) {
            return new_defns(load_first(env)) || env;
        };
    }(load_stdlib));
};
// Augment our "standard library" with a new 'sqrt' primitive function.
stddefs(function (env) {
    // We'll not be able to express x * x without the
    // ability to duplicate the top value on the stack.
    // We could also add 'pow' as a primitive for that
    // specific case.
    define(env, 'dup', prim(function (stack) {
        return push(stack, topitem(stack));
    }));
    define(env, 'sqrt', prim(function (stack) {
        let x = pop(stack);
        return push(stack, number(Math.sqrt(x.v)));
    }));
    return env;
});
// We always want the standard library for tests, so simplify it
// with a function.
let test_env = function () {
    return load_stdlib(mk_env());
};
// Now we can finally calculate the distance between two points.
tests.distance = function (x1, y1, x2, y2) {
    let program = [
        number(x1),     // Store x1
        number(x2),     // Store x2
        word('-'),      // Take the difference
        word('dup'),    // 'dup' followed by '*' will square it.
        word('*'),
        number(y1),     // Store y1
        number(y2),     // Store y2
        word('-'),      // Take the difference
        word('dup'),    // 'dup' followed by '*' will square it.
        word('*'),      
        word('+'),      // Sum of the two squares.
        word('sqrt')    // The square root of that.
    ];
    return run(test_env(), program, 0, []);
};
