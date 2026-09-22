import httpStatus from 'http-status-codes';

import { prisma } from '../../lib/prisma';
import type { ICreatePricingRule, IUpdatePricingRule } from './pricing.interface';
import { AppError } from '../../utils/AppError';

const createPricingRule = async (payload: ICreatePricingRule) => {
  const pricingRule = await prisma.pricingRule.create({
    data: {
      name: payload.name,
      basePrice: payload.basePrice,
      perKgPrice: payload.perKgPrice,
      codPercentage: payload.codPercentage,
    },
  });

  return pricingRule;
};

const getAllPricingRules = async () => {
  const pricingRules = await prisma.pricingRule.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return pricingRules;
};

const updatePricingRule = async (pricingRuleId: string, payload: IUpdatePricingRule) => {
  const existingPricingRule = await prisma.pricingRule.findUnique({
    where: {
      id: pricingRuleId,
    },
  });

  if (!existingPricingRule) {
    throw new AppError(httpStatus.NOT_FOUND, 'Pricing rule not found');
  }

  const pricingRule = await prisma.pricingRule.update({
    where: {
      id: pricingRuleId,
    },
    data: payload,
  });

  return pricingRule;
};

const deactivatePricingRule = async (pricingRuleId: string) => {
  const existingPricingRule = await prisma.pricingRule.findUnique({
    where: {
      id: pricingRuleId,
    },
  });

  if (!existingPricingRule) {
    throw new AppError(httpStatus.NOT_FOUND, 'Pricing rule not found');
  }

  if (!existingPricingRule.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Pricing rule is already inactive');
  }

  const pricingRule = await prisma.pricingRule.update({
    where: {
      id: pricingRuleId,
    },
    data: {
      isActive: false,
    },
  });

  return pricingRule;
};

export const pricingService = {
  createPricingRule,
  getAllPricingRules,
  updatePricingRule,
  deactivatePricingRule,
};
