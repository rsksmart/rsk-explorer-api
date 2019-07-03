const assert = require('assert');
const HashrateCalculator = require('../../src/api/lib/hashrateCalculator.js').HashrateCalculator;

describe('hashrateCalculator', () => {
    context('hashratePerMiner', () => {
        it('returns an empty object when argument is not an array', () => {
            const calc = new HashrateCalculator();

            const hashrate = calc.hashratePercentagePerMiner();

            assert.deepEqual(hashrate, {});
        });

        it('returns an empty object when no blocks', () => {
            const calc = new HashrateCalculator();

            const hashrate = calc.hashratePercentagePerMiner([]);

            assert.deepEqual(hashrate, {});
        });

        it('returns 1 for only one miner and 1 block', () => {
            const calc = new HashrateCalculator();

            const blocks = [
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' }
            ]
            const hashrate = calc.hashratePercentagePerMiner(blocks);

            assert.deepEqual(hashrate, {
                '0x0a': 1
            });
        });

        it('returns 0.5 for two miners that mined one block with the same block difficulty each', () => {
            const calc = new HashrateCalculator();

            const blocks = [
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0b', difficulty: '0x11f36beaf6690ac7e6' },
            ]
            const hashrate = calc.hashratePercentagePerMiner(blocks);

            assert.deepEqual(hashrate, {
                '0x0a': 0.5,
                '0x0b': 0.5
            });
        });

        it('returns 1 for one miner that mined more than one block', () => {
            const calc = new HashrateCalculator();

            const blocks = [
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e3' },
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e2' },
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e1' },
            ]
            const hashrate = calc.hashratePercentagePerMiner(blocks);

            assert.deepEqual(hashrate, {
                '0x0a': 1
            });
        });

        it('returns 0.25 for four miners that mined one block with the same block difficulty each', () => {
            const calc = new HashrateCalculator();

            const blocks = [
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0b', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0c', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0d', difficulty: '0x11f36beaf6690ac7e6' }
            ]
            const hashrate = calc.hashratePercentagePerMiner(blocks);

            assert.deepEqual(hashrate, {
                '0x0a': 0.25,
                '0x0b': 0.25,
                '0x0c': 0.25,
                '0x0d': 0.25
            });
        });

        it('returns the corresponding value when four miners mine one block each with different difficulty', () => {
            const calc = new HashrateCalculator();

            const blocks = [
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0b', difficulty: '0x13b768fb4f683f5fd5' },
                { miner: '0x0c', difficulty: '0x0f54a7810c212d7df0' },
                { miner: '0x0d', difficulty: '0x0f54a7810c212d7df0' }
            ]
            const hashrate = calc.hashratePercentagePerMiner(blocks);

            assert.deepEqual(hashrate, {
                '0x0a': 0.263,
                '0x0b': 0.289,
                '0x0c': 0.224,
                '0x0d': 0.224
            });
        });

        it('returns the corresponding value when four miners mine several blocks each with different difficulty', () => {
            const calc = new HashrateCalculator();

            const blocks = [
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0b', difficulty: '0x13b768fb4f683f5fd5' },
                { miner: '0x0a', difficulty: '0x13b768fb4f683f5fd5' },
                { miner: '0x0c', difficulty: '0x10050a0cc225820cdd' },
                { miner: '0x0d', difficulty: '0x10050a0cc225820cdd' },
                { miner: '0x0d', difficulty: '0x0f54a7810c212d7df0' },
                { miner: '0x0a', difficulty: '0x11f36beaf6690ac7e6' },
                { miner: '0x0d', difficulty: '0x0f54a7810c212d7d00' },
                { miner: '0x0c', difficulty: '0x10050a0cc225820cdd' },
                { miner: '0x0b', difficulty: '0x10050a0cc225820fff' },
                { miner: '0x0d', difficulty: '0x11f36beaf6690ac7e6' },
            ]
            const hashrate = calc.hashratePercentagePerMiner(blocks);

            assert.deepEqual(hashrate, {
                '0x0a': 0.296,
                '0x0b': 0.190,
                '0x0c': 0.170,
                '0x0d': 0.344
            });
        });
    });
});