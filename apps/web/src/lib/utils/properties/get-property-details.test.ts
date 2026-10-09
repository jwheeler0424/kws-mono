import { describe, expect, it } from 'vitest';

import { getLivingArea } from './get-property-details';

describe('getLivingArea', () => {
  it('prefers LivingArea and its units', () => {
    expect(
      getLivingArea({
        livingArea: '1200',
        livingAreaUnits: 'SqFt',
        aboveGradeFinishedArea: '1400',
        belowGradeFinishedArea: '300',
        buildingAreaTotal: '2000',
      }),
    ).toEqual({ value: 1200, units: 'SqFt' });
  });

  it('uses NWMLS total dwelling square footage before other backups', () => {
    expect(
      getLivingArea({
        NWM_TotalDwellingSqFt: '1,850',
        NWM_SquareFootageFinished: '1600',
        aboveGradeFinishedArea: 1500,
        buildingAreaTotal: 2000,
      }),
    ).toEqual({ value: 1850, units: 'SqFt' });
  });

  it('prioritizes NWMLS calculated square footage over other backup fields', () => {
    expect(
      getLivingArea({
        NWM_CalculatedSquareFootage: '1,750',
        NWM_TotalDwellingSqFt: '1850',
        NWM_SquareFootageFinished: '1600',
        aboveGradeFinishedArea: 1500,
        buildingAreaTotal: 2000,
      }),
    ).toEqual({ value: 1750, units: 'SqFt' });
  });

  it('uses NWMLS finished square footage before RESO grade fields', () => {
    expect(
      getLivingArea({
        NWM_SquareFootageFinished: '1,600',
        aboveGradeFinishedArea: 1500,
        belowGradeFinishedArea: 300,
      }),
    ).toEqual({ value: 1600, units: 'SqFt' });
  });

  it('combines above- and below-grade finished area when LivingArea is absent', () => {
    expect(
      getLivingArea({ aboveGradeFinishedArea: '1400', belowGradeFinishedArea: '300' }),
    ).toEqual({ value: 1700, units: null });
  });

  it('uses the available finished-area field before total building area', () => {
    expect(getLivingArea({ aboveGradeFinishedArea: 1400, buildingAreaTotal: 2000 })).toEqual({
      value: 1400,
      units: null,
    });
  });

  it('falls back to total building area when finished areas are absent', () => {
    expect(getLivingArea({ buildingAreaTotal: '2000', buildingAreaUnits: 'SqFt' })).toEqual({
      value: 2000,
      units: 'SqFt',
    });
  });

  it('uses approximate NWMLS building area as the final fallback', () => {
    expect(getLivingArea({ NWM_ApproximateBuildingSquareFeet: '2200' })).toEqual({
      value: 2200,
      units: 'SqFt',
    });
  });

  it('treats zero and invalid values as missing', () => {
    expect(getLivingArea({ livingArea: '0', aboveGradeFinishedArea: 'unknown' })).toBeNull();
  });
});
