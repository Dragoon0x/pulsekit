var pk = require('../dist/index.js')
var passed = 0, failed = 0
function assert(c, m) { if (c) { passed++; console.log('  ✓ ' + m) } else { failed++; console.error('  ✗ ' + m) } }
function assertEq(a, b, m) { assert(a === b, m + ' (got: ' + a + ')') }

console.log('\n  Exports')
assert(typeof pk.Pulse === 'function', 'Pulse component')
assert(typeof pk.PulseEngine === 'function', 'PulseEngine class')
assert(typeof pk.renderMode === 'function', 'renderMode')
assert(typeof pk.getAllModeNames === 'function', 'getAllModeNames')
assert(Array.isArray(pk.ALL_MODES), 'ALL_MODES')

console.log('\n  Modes')
var names = pk.getAllModeNames()
assertEq(names.length, 132, '132 modes registered')
assertEq(pk.ALL_MODES.length, 132, '132 modes in ALL_MODES')

console.log('\n  Engine basics')
var e = new pk.PulseEngine({ value: 50 })
var s = e.getState()
assertEq(s.value, 50, 'Initial value')
assert(s.normalizedValue === 0.5, 'Normalized 0.5')
assertEq(s.momentum, 'flat', 'Initial momentum flat')

e.setValue(80)
assert(e.getState().momentum === 'up', 'Momentum up')
e.setValue(20)
assert(e.getState().momentum === 'down', 'Momentum down')

var c = e.getConfig()
assertEq(c.mode, 'ring', 'Default mode')
assertEq(c.min, 0, 'Default min')
assertEq(c.max, 100, 'Default max')
assertEq(c.color, '#3b82f6', 'Default color')
assertEq(c.theme, 'dark', 'Default theme')

e.setConfig({ mode: 'gauge', color: '#ef4444' })
assertEq(e.getConfig().mode, 'gauge', 'Mode update')
assertEq(e.getConfig().color, '#ef4444', 'Color update')

console.log('\n  All 132 modes instantiate')
names.forEach(function(mode) {
  var eng = new pk.PulseEngine({ value: 50, mode: mode })
  assert(eng.getConfig().mode === mode, mode)
  eng.destroy()
})

e.destroy()

console.log('\n  ' + passed + ' passed, ' + failed + ' failed\n')
process.exit(failed > 0 ? 1 : 0)
