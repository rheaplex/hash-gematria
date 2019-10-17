/*  Hash Gematria - Find lists of words with common hash prefixes.
    Copyright (C) 2019 Rhea Myers <rhea@myers.studio>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/* global process, require */


////////////////////////////////////////////////////////////////////////////////
// Libraries
////////////////////////////////////////////////////////////////////////////////

const crypto = require('crypto');
const commandLineArgs = require('command-line-args');
const fs = require('fs');


////////////////////////////////////////////////////////////////////////////////
// Configuration constants
////////////////////////////////////////////////////////////////////////////////

// The length of the shared prefix / match at the start (left) of the hash
const MIN_PREFIX_LENGTH = 4;
const MAX_PREFIX_LENGTH = 8;

// The number of strings with the same hash prefix that we select
const MIN_COUNT = 2;
const MAX_COUNT = 8;


////////////////////////////////////////////////////////////////////////////////
// Command line configuration
////////////////////////////////////////////////////////////////////////////////

const optionDefinitions = [
  {
    name: 'algorithm',
    alias: 'a',
    type: String,
    description: 'The hashing algorithm to use (see openssl list -digest-algorithms).',
    defaultValue: 'sha256'
  },
  {
    name: 'lowercase',
    alias: 'l',
    type: Boolean,
    description: 'Whether to maintain character case or lowercase everything.',
    defaultValue: false
  },
  {
    name: 'dictionary',
    alias: 'd',
    type: String,
    description: 'The full path to the word list file (one word per line) to use.',
    defaultValue: '/etc/dictionaries-common/words'
  },
  {
    name: 'help',
    description: 'Print this usage guide.'
  }
];

const options = commandLineArgs(optionDefinitions);

if (typeof options.help !== 'undefined') {
  const commandLineUsage = require('command-line-usage');
  const sections = [
    {
      header: 'Hash Prefix Similarity',
      content: 'Finds words with matching hash prefixes of given lengths.'
    },
    {
      header: 'Options',
      optionList: optionDefinitions
    }
  ];
  const usage = commandLineUsage(sections);
  console.log(usage);
  process.exit();
}

const dictionary_file = options.dictionary;
const hash_algorithm = options.algorithm;


////////////////////////////////////////////////////////////////////////////////
// Words - case preserved, but none with apostrophes
////////////////////////////////////////////////////////////////////////////////

// let because we may need to rebind next
let words = fs
      .readFileSync(dictionary_file)
      .toString('utf-8')
      .split('\n')
      .filter(word => word.indexOf('\'') === -1);

if (options.lowercase) {
  words = words.map(word => word.toLowerCase());
}

// Hashes, of the kind specified above
const hashes = words.map(
  word => crypto.createHash(hash_algorithm)
    .update(word)
    .digest('hex')
);


////////////////////////////////////////////////////////////////////////////////
// Words with matching hash prefixes
////////////////////////////////////////////////////////////////////////////////

// A mapping of:
// shared prefix length
//   => shared prefix
//     => array of hash => string
const matches = {};

for (let i = MIN_PREFIX_LENGTH; i <= MAX_PREFIX_LENGTH; i++) {
  matches[i] = {};
  hashes.forEach((hash, index) => {
    const start = hash.slice(0, i);
    if (!matches[i][start]) {
      matches[i][start] = [];
    }
    let match = {};
    match[hashes[index]] = words[index];
    matches[i][start].push(match);
  });
}


////////////////////////////////////////////////////////////////////////////////
// Largest numbers of words with matching prefixes
////////////////////////////////////////////////////////////////////////////////

// A mapping of:
// number of matches
//   => shared prefix length
//     => shared prefix
//       => array of hash => string
const results = {};

for (let i = MIN_COUNT; i <= MAX_COUNT; i++) {
  results[i] = {};
  for (let j = MIN_PREFIX_LENGTH; j <= MAX_PREFIX_LENGTH; j++) {
    const matchesCopy = {};
    Object.keys(matches[j]).forEach(start => {
      if(matches[j][start].length == i) {
        matchesCopy[start] = matches[j][start];
      }
    });
    results[i][j] = matchesCopy;
  }
}


////////////////////////////////////////////////////////////////////////////////
// Dump the results in the universal data format
////////////////////////////////////////////////////////////////////////////////

const output = {
  dictionary: dictionary_file,
  algorithm: hash_algorithm,
  lowercase: options.lowercase,
  results: results
};

console.log(JSON.stringify(output, null, 2));
