/*jslint browser: true, nomen: true, plusplus: true */
/// @file coherent.js
/// @namespace engine

/// Coherent UI JavaScript interface.
/// The `engine` module contains all functions for communication between the UI and the game / application.

(function (window, _, Backbone) {
	'use strict';

	var isAttached = window.engine !== undefined,
		engine = _.extend(window.engine || {}, Backbone.Events);

	// inherited functions from Backbone.Events
	
	/// @function engine.on
	/// Register handler for and event
	/// @param {String} name name of the event
	/// @param {Function} callback callback function to be executed when the event has been triggered
	/// @param context *this* context for the function, by default the global object
	
	/// @function engine.off
	/// Remove handler for an event
	/// @param {String} name name of the event, by default removes all events
	/// @param {Function} callback the callback function to be removed, by default removes all callbacks for a given event
	/// @param context *this* context for the function, by default all removes all callbacks, regardless of context
	/// @warning Removing all handlers for `engine` will remove some *Coherent UI* internal events, breaking some functionality.
	
	/// @function engine.trigger
	/// Trigger an event
	/// This function will trigger any C++ handler registered for this event with `Coherent::UI::View::RegisterForEvent`
	/// @param {String} name name of the event
	/// @param ... any extra arguments to be passed to the event handlers

	engine.IsAttached = isAttached;
	engine._BindingsReady = false;
	engine._WindowLoaded = false;
	engine._RequestId = 0;
	engine._ActiveRequests = {};

	if (!isAttached) {
		engine.SendMessage = function (name, id) {
			var args = Array.prototype.slice.call(arguments, 2),

				call = (function (name, id, args) {
					return function () {
						var callback = engine[name],
							result = null,
							returnResult;
						
						if (callback !== undefined) {
							result = callback.apply(engine, args);
						}
						
						returnResult = (function (id, result) {
							return function() {
								engine.trigger('_Result', id, result);
							};
						}(id, result));
						
						window.setTimeout(returnResult, 33);
					};
				}(name, id, args));

			window.setTimeout(call, 16);
		};

		engine.TriggerEvent = function () {
			var args = Array.prototype.slice.call(arguments),
				trigger;

			args[0] = 'Fake_' + args[0];

			trigger = (function (args) {
				return function () {
					engine.trigger.apply(engine, args);
				};
			}(args));

			window.setTimeout(trigger, 16);
		};

		engine.BindingsReady = function () {
			engine._OnReady();
		};
	}
	
	/// @function engine.Call
	/// Call asynchronously a C++ handler and retrieve the result
	/// The C++ handler must have been registered with `Coherent::UI::View::BindCall`
	/// @param {String} name name of the C++ handler to be called
	/// @param ... any extra parameters to be passed to the C++ handler
	/// @param callback function to be called with the result from the C++ handler
	/// or handler object. This parameter is optional
	engine.Call = function () {
		engine._RequestId++;
		var id = engine._RequestId,
			messageArguments,
			callback = arguments[arguments.length - 1];

		messageArguments = Array.prototype.slice.call(arguments);
		if (callback instanceof Function) {
			messageArguments.pop();
			engine._ActiveRequests[id] = { callback: callback };
		} else if (callback instanceof Object) {
			messageArguments.pop();
			engine._ActiveRequests[id] = callback;
		} else {
			id = 0;
		}
		messageArguments.splice(1, 0, id);

		engine.SendMessage.apply(this, messageArguments);
	};

	engine._Result = function (requestId) {

		var handlers = engine._ActiveRequests[requestId],
			callee = null,
			resultArguments = null,
			self = null;

		delete engine._ActiveRequests[requestId];

		if (handlers) {
			callee = handlers.callback;
		}
		if (callee) {
			resultArguments = Array.prototype.slice.call(arguments);
			self = handlers.self || window;
			resultArguments.shift();
			callee.apply(self, resultArguments);
		}
	};
	
	engine._Errors = [ 'Success', 'ArgumentType', 'NoSuchMethod', 'NoResult' ];
	
	engine._ForEachError = function (errors, callback) {
		var length = errors.length;
		
		for (var i = 0; i < length; ++i) {
			callback(errors[i].first, errors[i].second);
		}
	};
	
	engine._MapErrors = function (errors) {
		var length = errors.length;
		
		for (var i = 0; i < length; ++i) {
			errors[i].first = engine._Errors[errors[i].first];
		}
	};

	
	engine._TriggerError = function (type, message) {
		engine.trigger('Error', type, message);
	};
	
	engine._OnError = function (requestId, errors) {
		engine._MapErrors(errors);
		
		if (requestId === 0) {
			engine._ForEachError(errors, engine._TriggerError);
		}
		else {
			var handlers = engine._ActiveRequests[requestId],
				callee = null,
				resultArguments = null,
				self = null;

			delete engine._ActiveRequests[requestId];

			if (handlers) {
				callee = handlers.error;
			}
			if (callee) {
				self = handlers.self || window;
				callee.apply(self, [ errors ]);
			}
			else
			{
				engine._ForEachError(errors, engine._TriggerError);
			}
		}
	};

	engine._Register = function (eventName) {
		var trigger = (function (name, engine) {
			return function () {
				var eventArguments = [name];
				eventArguments.push.apply(eventArguments, arguments);
				engine.TriggerEvent.apply(this, eventArguments);
			};
		}(eventName, engine));

		engine.bind(eventName, trigger);
	};

	engine._OnReady = function () {
		engine._BindingsReady = true;
		if (engine._WindowLoaded) {
			engine.trigger('Ready');
		}
	};

	engine._OnWindowLoaded = function () {
		engine._WindowLoaded = true;
		if (engine._BindingsReady) {
			engine.trigger('Ready');
		}
	};

	window.onload = (function (originalWindowLoaded) {
		return function () {
			if (originalWindowLoaded) {
				originalWindowLoaded();
			}
			engine._OnWindowLoaded();
		};
	}(window.onload));

	engine.bind('_Result', engine._Result, engine);
	engine.bind('_Register', engine._Register, engine);
	engine.bind('_OnReady', engine._OnReady, engine);
	engine.bind('_OnError', engine._OnError, engine);

	window.engine = engine;

	engine.BindingsReady();
	
}(window, _, Backbone));
