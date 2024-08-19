import { EmissionConfig, EmissionData, Emissions, UserEmissions } from '../src/emissions.js';

test('load emissions for pool and user', () => {
  const config_xdr_string =
    'AAAABgAAAAAAAAABbH7xyqK9TSdA4nUSJJgPtdaQojola63Pjoeh+LNvtzQAAAAQAAAAAQAAAAIAAAAPAAAACkVtaXNDb25maWcAAAAAAAMAAAADAAAAAQAAABEAAAABAAAAAgAAAA8AAAADZXBzAAAAAAUAAAAAAA27oAAAAA8AAAAKZXhwaXJhdGlvbgAAAAAABQAAAABlVmCs';
  const data_xdr_string =
    'AAAABgAAAAAAAAABbH7xyqK9TSdA4nUSJJgPtdaQojola63Pjoeh+LNvtzQAAAAQAAAAAQAAAAIAAAAPAAAACEVtaXNEYXRhAAAAAwAAAAMAAAABAAAAEQAAAAEAAAACAAAADwAAAAVpbmRleAAAAAAAAAoAAAAAAAAAAAAAAAACUpz/AAAADwAAAAlsYXN0X3RpbWUAAAAAAAAFAAAAAGVSMp8=';
  const user_xdr_string =
    'AAAABgAAAAAAAAABbH7xyqK9TSdA4nUSJJgPtdaQojola63Pjoeh+LNvtzQAAAAQAAAAAQAAAAIAAAAPAAAACFVzZXJFbWlzAAAAEQAAAAEAAAACAAAADwAAAApyZXNlcnZlX2lkAAAAAAADAAAAAwAAAA8AAAAEdXNlcgAAABIAAAAAAAAAACyfzOsG6kr4egXEnuSiQ/GlhwkxRxrt2FCrVKgB9OblAAAAAQAAABEAAAABAAAAAgAAAA8AAAAHYWNjcnVlZAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAFaW5kZXgAAAAAAAAKAAAAAAAAAAAAAAAAAlKc/w==';

  const config = EmissionConfig.fromLedgerEntryData(config_xdr_string);
  const data = EmissionData.fromLedgerEntryData(data_xdr_string);
  const emissions = new Emissions(config, data, 1);
  const user = UserEmissions.fromLedgerEntryData(user_xdr_string);

  expect(config.eps).toEqual(BigInt(900000));
  expect(config.expiration).toEqual(1700159660);
  expect(data.index).toEqual(BigInt(38968575));
  expect(data.lastTime).toEqual(1699885727);
  expect(user.accrued).toEqual(BigInt(0));
  expect(user.index).toEqual(BigInt(38968575));

  const supply = BigInt(235026470698);
  const balance = BigInt(9986916470);
  const timestamp = 1699888478;

  emissions.accrue(supply, 7, timestamp);
  const accrued = user.estimateAccrual(emissions, 7, balance);
  expect(accrued).toEqual(10.5207171);
});
