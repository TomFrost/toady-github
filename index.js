/*
 * Github
 * Toady Module
 * Copyright 2013 Tom Frost
 */

var github = require('octonode').client();

/**
 * Regular Expression to match GitHub URLs and extract the user and repo.
 * @type {RegExp}
 */
const GITHUB_URL = /github.com\/([a-zA-Z0-9_\-]+)\/([a-zA-Z0-9_\-]+)(?:$|\W)/;

/**
 * Listens for GitHub URLs spoken in a channel and follows up with details
 * about the repository. This is on by default, but can be turned off (and back
 * on) on a per channel basis.
 *
 * @param {Object} config A Toady config object
 * @param {Object} client An IRC client object
 * @param {Object} modMan The Toady ModManager object
 * @returns {Object} A Toady mod
 */
module.exports = function(config, client, modMan) {

	/**
	 * Intercepts messages containing a github URL.
	 *
	 * @param {String} nick The nick who sent the message
	 * @param {String} to The target channel
	 * @param {string} text The message
	 */
	function messageHandler(nick, to, text) {
		if (!config.blockedChans[to]) {
			var match = text.match(GITHUB_URL);
			if (match)
				showDetails(to, match[1], match[2]);
		}
	}
	client.on('message#', messageHandler);

	/**
	 * Sends the details of a GitHub repo to a channel.
	 *
	 * @param {String} channel The channel to which details should be sent
	 * @param {String} user A GitHub username
	 * @param {String} repo A GitHub repo name belonging to the specified user
	 */
	function showDetails(channel, user, repo) {
		github.repo(user + '/' + repo).info(function(err, info) {
			if (err)
				client.notice(channel, 'Github: ' + err.message);
			else {
				var msg = info.full_name + ': ' + info.description,
					lastCommit = info.pushed_at.substring(0,
						info.pushed_at.indexOf('T'));
				if (info.fork)
					msg += " [Forked from " + info.parent.full_name + ']';
				if (info.language)
					msg += " [Language: " + info.language + ']';
				msg += " [Stars: " + info.watchers + ']';
				msg += " [Forks: " + info.forks + ']';
				msg += " [Last commit: " + lastCommit + ']';
				if (info.has_issues)
					msg += " [Issues: " + info.open_issues + ']';
				if (info.homepage)
					msg += " [Homepage: " + info.homepage + ']';
				msg += ' ' + info.html_url;
				client.notice(channel, msg);
			}
		});
	}

	return {
		name: "GitHub",
		commands: {
			githubon: {
				handler: function(from, to, target, args, inChan) {
					var replyTo = inChan ? to : from;
					if (config.blockedChans[target]) {
						delete config.blockedChans[target];
						config.save();
						client.notice(replyTo,
							"GitHub URL details are now ON for " + target);
					}
					else {
						client.notice(replyTo,
							"GitHub URL details are already on for " + target);
					}
				},
				desc: "Turns GitHub URL details on for a given channel",
				help: [
					"Format: {cmd} [#channel]",
					"Examples:",
					"  /msg {nick} {cmd} #developers",
					"  {!}{cmd}",
					" ",
					"Note: If this command is said in a channel and no other \
channel is specified, the current channel will be targeted."
				],
				minPermission: '@',
				targetChannel: true
			},
			githuboff: {
				handler: function(from, to, target, args, inChan) {
					var replyTo = inChan ? to : from;
					if (!config.blockedChans[target]) {
						config.blockedChans[target] = true;
						config.save();
						client.notice(replyTo,
							"GitHub URL details are now OFF for " + target);
					}
					else {
						client.notice(replyTo,
							"GitHub URL details were already OFF for " +
							target);
					}
				},
				desc: "Turns GitHub URL details off for a given channel",
				help: [
					"Format: {cmd} [#channel]",
					"Examples:",
					"  /msg {nick} {cmd} #developers",
					"  {!}{cmd}",
					" ",
					"Note: If this command is said in a channel and no other \
channel is specified, the current channel will be targeted."
				],
				minPermission: '@',
				targetChannel: true
			}
		},
		unload: function() {
			client.removeListener('message#', messageHandler);
		}
	};
};

module.exports.configDefaults = {
	blockedChans: {}
};
