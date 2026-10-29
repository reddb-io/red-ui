import {describe,it,expect} from 'vitest';
import {parseOpenContract} from './boot-params';
describe('workspace Open Contract destinations',()=>{
 it.each(['/query','/collections','/cluster','/security','/analytics','/settings','/appearance','/ask'])('accepts maintained route %s without discarding the connection',route=>{
  const contract=parseOpenContract(`?cs=http%3A%2F%2Flocalhost%3A5055&to=${encodeURIComponent(route)}`);
  expect(contract.to).toBe(route);expect(contract.cs).toBe('http://localhost:5055');
 });
 it.each(['//elsewhere.test','https://elsewhere.test','/unknown','/appearance/../../admin'])('rejects unmaintained or external destination %s',route=>{
  expect(()=>parseOpenContract(`?cs=http%3A%2F%2Flocalhost%3A5055&to=${encodeURIComponent(route)}`)).toThrow();
 });
});
