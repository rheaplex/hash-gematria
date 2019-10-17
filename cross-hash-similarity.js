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

const ALGORITHMS = [
  'BLAKE2b512',
  'BLAKE2s256',
  'MD4',
  'MD5',
  'RIPEMD160',
  'SHA1',
  'SHA256',
  'SHA512',
];
const ALGORITHMS_COUNT = ALGORITHMS.length;

// The length of the shared prefix / match at the start (left) of the hash
const MIN_PREFIX_LENGTH = 2;
const MAX_PREFIX_LENGTH = ALGORITHMS_COUNT;


////////////////////////////////////////////////////////////////////////////////
// Command line configuration
////////////////////////////////////////////////////////////////////////////////

const optionDefinitions = [
  {
    name: 'lowercase',
    alias: 'l',
    type: Boolean,
    description: 'Whether to maintain character case or lowercase everything.',
    defaultValue: false
  },
    {
    name: 'matches',
    alias: 'm',
    type: Number,
    description: 'The minimum number of matches to use.',
    defaultValue: 2
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
      header: 'Cross Hash Similarity',
      content: 'Finds words with matching prefixes across different hashes.'
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
const match_count = options.matches;


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


////////////////////////////////////////////////////////////////////////////////
// Words with matching hash prefixes
////////////////////////////////////////////////////////////////////////////////

// A map of:
// word => map of hash name => hash value

const hashes = {};
words.map(word => {
  hashes[word] = {};
  ALGORITHMS.forEach(algorithm => {
    hashes[word][algorithm] = crypto.createHash(algorithm)
      .update(word)
      .digest('hex');
  });
});

// A map of:
// shared prefix length
//   => word => map of hash name => hash value

const results = {};

for (let i = MIN_PREFIX_LENGTH; i <= MAX_PREFIX_LENGTH; i++) {
  results[i] = {};
  // For each word
  Object.keys(hashes).forEach(word => {
    const shared = {};
    // Build a map of prefixes to the algorithms that produced them
    ALGORITHMS.forEach(algorithm => {
      const prefix = hashes[word][algorithm].slice(0, i);
      (shared[prefix] = shared[prefix] || {})[algorithm]
        = hashes[word][algorithm];
    });
    // Delete any prefixes that don't have enough matches
    Object.keys(shared).forEach(prefix => {
      if (Object.keys(shared[prefix]).length < match_count) {
        delete shared[prefix];
      }
    });
    // If there are any shared prefixes, add this word to the results
    if(Object.keys(shared).length > 0) {
      results[i][word] = shared;
    }
  });
}

////////////////////////////////////////////////////////////////////////////////
// Dump the results in the universal data format
////////////////////////////////////////////////////////////////////////////////

const output = {
  dictionary: dictionary_file,
  algorithms: ALGORITHMS,
  lowercase: options.lowercase,
  results: results
};

console.log(JSON.stringify(output, null, 2));
