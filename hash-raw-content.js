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
    name: 'min',
    alias: 'm',
    type: Number,
    description: 'The minimum match length.',
    defaultValue: 3
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
      header: 'Hash Binary Content Matching',
      content: 'Finds words in hashes of other words.'
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
const minimum_length = options.min;


////////////////////////////////////////////////////////////////////////////////
// Words - case preserved, but none with apostrophes
////////////////////////////////////////////////////////////////////////////////

// let because we may need to rebind next
let words = fs
    .readFileSync(dictionary_file)
    .toString('utf-8')
    .split('\n')
// The word list contains A, B, C, etc.
    .filter(word => word.length > 1)
// The word list contains pretty much every word with "'s" added
    .filter(word => word.indexOf('\'s') === -1);

const wordsLowercase = words.map(word => word.toLowerCase());

if (options.lowercase) {
  words = wordsLowercase;
}

// Hashes, of the kind specified above
const hashes = words.map(
  word => crypto.createHash(hash_algorithm)
    .update(word)
    .digest('binary')
);


////////////////////////////////////////////////////////////////////////////////
// Words in hashes of other words
////////////////////////////////////////////////////////////////////////////////

// A mapping of:
// shared prefix length
//   => shared prefix
//     => array of hash => string
const results = {};

hashes.forEach((hash, hashIndex) => {
  // Case insensitive match
  const hashLower = hash.toLowerCase();
  const contained = [];
  wordsLowercase.forEach((word, wordIndex) => {
    // We filter length here rather than build a filtered list above so that
    // indexes match.
    if (word.length >= minimum_length && hashLower.includes(word)) {
      // Push word in its originally hashed case
      contained.push(words[wordIndex]);
    }
  });
  // If there were any matches, add them to the results
  if (contained.length > 0) {
    results[words[hashIndex]] = {
      hash: hash,
      contains: contained
    };
  }
});

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
