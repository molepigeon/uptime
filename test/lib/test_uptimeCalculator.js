var should = require('should');
var async = require('async');
var mongoose = require('../../bootstrap');
var UptimeCalculator = require('../../lib/uptimeCalculator');
var Check = require('../../models/check');
var CheckEvent = require('../../models/checkEvent');
var Ping = require('../../models/ping');

var check1, check2, now; // fixtures

describe('uptimeCalculator', function() {

  before(function(done) {
    async.parallel([
      function(cb) { Ping.collection.drop(cb) },
      function(cb) { Check.collection.drop(cb) },
      function(cb) { CheckEvent.collection.drop(cb) },
    ], done);
  });

  before(function() {
    now = Date.now();
  });

  before(function(done) {
    check1 = new Check();
    check1.save(function(err) {
      if (err) throw (err);
      async.series([
        function(cb) { Ping.createForCheck(false, now - 3000, 100, check1, 'dummy1', '', cb); },
        function(cb) { Ping.createForCheck(false, now - 2000, 100, check1, 'dummy2', '', cb); },
        function(cb) { Ping.createForCheck(true,  now - 1000, 100, check1, 'dummy3', '', cb); },
        function(cb) { Ping.createForCheck(true,  now,        100, check1, 'dummy4', '', cb); },
        function(cb) { Ping.createForCheck(true,  now + 1000, 100, check1, 'dummy5', '', cb); },
        function(cb) { Ping.createForCheck(false, now + 2000, 100, check1, 'dummy6', '', cb); },
        function(cb) { Ping.createForCheck(true,  now + 3000, 100, check1, 'dummy7', '', cb); },
      ], done);
    });
  });

  before(function(done) {
    check2 = new Check();
    check2.save(done);
  });

  describe('#constructor', function() {

    it('should accept Check objects', function(done) {
      var calculator = new UptimeCalculator(check1);
      calculator.getPingBeforeTime(now - 3000, function(err, ping) {
        if (err) throw (err);
        ping.monitorName.should.eql('dummy1');
        done();
      });
    });

    it('should accept Check identifiers', function(done) {
      var calculator = new UptimeCalculator(check1._id);
      calculator.getPingBeforeTime(now - 3000, function(err, ping) {
        if (err) throw (err);
        ping.monitorName.should.eql('dummy1');
        done();
      });
    });

  });

  describe('#getPingBeforeTime', function() {

    it('should return nothing for new Checks', function(done) {
      var calculator = new UptimeCalculator(check2);
      calculator.getPingBeforeTime(now, function(err, ping) {
        if (err) throw (err);
        should.not.exist(ping);
        done();
      });
    });

    it('should return the latest ping', function(done) {
      var calculator = new UptimeCalculator(check1);
      calculator.getPingBeforeTime(now, function(err, ping) {
        if (err) throw (err);
        ping.monitorName.should.eql('dummy4');
        done();
      });
    });

  });

  describe('#getUptimePeriods', function() {

    it('should return an empty array when there is no ping at all', function(done) {
      var calculator = new UptimeCalculator(check2);
      calculator.getUptimePeriods(Date.now(), Date.now() + 1000, function(err, periods) {
        if (err) throw (err);
        periods.should.eql([]);
        done();
      });
    });

    it('should return an empty array when there is no up ping', function(done) {
      var calculator = new UptimeCalculator(check1);
      calculator.getUptimePeriods(now - 6000, now - 3000, function(err, periods) {
        if (err) throw (err);
        periods.should.eql([ ]);
        done();
      });
    });

    it('should return a period ending at the end of the lookup period when the latest ping is up', function(done) {
      var calculator = new UptimeCalculator(check1);
      calculator.getUptimePeriods(now + 3000, now + 6000, function(err, periods) {
        if (err) throw (err);
        periods.should.eql([ [now + 3000, now + 6000] ]);
        done();
      });
    });

    it('should return a period starting at the beginning of the lookup period when the previous ping is up', function(done) {
      var calculator = new UptimeCalculator(check1);
      calculator.getUptimePeriods(now, now + 1000, function(err, periods) {
        if (err) throw (err);
        periods.should.eql([ [now, now + 1000] ]);
        done();
      });
    });

    it('should return an uptime period even if the state at the beginning and at the end are down', function(done) {
      var calculator = new UptimeCalculator(check1);
      calculator.getUptimePeriods(now - 3000, now + 2000, function(err, periods) {
        if (err) throw (err);
        periods.should.eql([ [ now - 1000, now + 2000 ]]);
        done();
      });
    });

    it('should return the several periods when a downtime period lies in the middle of the interval', function(done) {
      var calculator = new UptimeCalculator(check1);
      calculator.getUptimePeriods(now - 3000, now + 3000, function(err, periods) {
        if (err) throw (err);
        periods.should.eql([ [now - 1000, now + 2000], [now + 3000, now + 3000] ]);
        done();
      });
    });

  });
  
  describe('#testFlattenPeriod', function() {
    it('should return empty array when passed an empty array', function() {
      UptimeCalculator.flattenPeriods([]).should.eql([]);
    });
    it('should return a single periods array when passed a single periods array', function() {
      UptimeCalculator.flattenPeriods([[[1, 2]]]).should.eql([[1, 2]]);
    });
    it('should return a two periods array when passed a two non adjacent periods array', function() {
      UptimeCalculator.flattenPeriods([[[1, 2]], [[3, 4]]]).should.eql([[1, 2], [3, 4]]);
    });
    it('should concatenate adjacent periods array', function() {
      UptimeCalculator.flattenPeriods([[[1, 2]], [[2, 3]]]).should.eql([[1, 3]]);
    });
    it('should flatten period arrays', function() {
      UptimeCalculator
      .flattenPeriods([ [[1, 2], [4, 5], [8, 9]], [[9, 11], [13, 14]], [[16, 18], [20, 21]], [[21, 22]] ])
      .should.eql([ [1, 2], [4, 5], [8, 11], [13, 14], [16, 18], [20, 22] ]);
    });
  });

});