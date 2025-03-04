import {
  demicrofy,
  formatANCWithPostfixUnits,
  formatLP,
  formatRate,
  formatUSTWithPostfixUnits,
} from '@anchor-protocol/notation';
import { uANC, uUST } from '@anchor-protocol/types';
import { MenuItem } from '@material-ui/core';
import { ActionButton } from '@terra-dev/neumorphism-ui/components/ActionButton';
import { HorizontalScrollTable } from '@terra-dev/neumorphism-ui/components/HorizontalScrollTable';
import { IconSpan } from '@terra-dev/neumorphism-ui/components/IconSpan';
import { InfoTooltip } from '@terra-dev/neumorphism-ui/components/InfoTooltip';
import { Section } from '@terra-dev/neumorphism-ui/components/Section';
import big, { Big } from 'big.js';
import { screen } from 'env';
import { useBorrowAPY } from 'pages/borrow/queries/borrowAPY';
import { MoreMenu } from 'pages/gov/components/MoreMenu';
import { SubHeader } from 'pages/gov/components/SubHeader';
import {
  ancGovernancePathname,
  ancUstLpPathname,
  govPathname,
  ustBorrowPathname,
} from 'pages/gov/env';
import { useANCPrice } from 'pages/gov/queries/ancPrice';
import { useClaimableAncUstLp } from 'pages/gov/queries/claimableAncUstLp';
import { useClaimableUstBorrow } from 'pages/gov/queries/claimableUstBorrow';
import { useLPStakingState } from 'pages/gov/queries/lpStakingState';
import { useRewardsAncGovernance } from 'pages/gov/queries/rewardsAncGovernance';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

export interface RewardsProps {
  className?: string;
}

export function RewardsBase({ className }: RewardsProps) {
  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const {
    data: { ancPrice },
  } = useANCPrice();

  const {
    data: { lpStakingState },
  } = useLPStakingState();

  const {
    data: { userLPStakingInfo, userLPBalance },
  } = useClaimableAncUstLp();

  const {
    data: { userGovStakingInfo, userANCBalance },
  } = useRewardsAncGovernance();

  const {
    data: { borrowerInfo, marketState },
  } = useClaimableUstBorrow();

  const {
    data: { govRewards, lpRewards, borrowerDistributionAPYs },
  } = useBorrowAPY();

  // ---------------------------------------------
  // logics
  // ---------------------------------------------
  const ancUstLp = useMemo(() => {
    if (!ancPrice || !lpStakingState || !userLPStakingInfo || !userLPBalance) {
      return undefined;
    }

    const totalUserLPHolding = big(userLPBalance.balance).plus(
      userLPStakingInfo.bond_amount,
    );

    const withdrawableAssets = {
      anc: big(ancPrice.ANCPoolSize)
        .mul(totalUserLPHolding)
        .div(ancPrice.LPShare === '0' ? 1 : ancPrice.LPShare) as uANC<Big>,
      ust: big(ancPrice.USTPoolSize)
        .mul(totalUserLPHolding)
        .div(ancPrice.LPShare === '0' ? 1 : ancPrice.LPShare) as uUST<Big>,
    };

    const staked = userLPStakingInfo.bond_amount;

    const stakable = userLPBalance.balance;

    const reward = userLPStakingInfo.pending_reward;

    return { withdrawableAssets, staked, stakable, reward };
  }, [ancPrice, lpStakingState, userLPBalance, userLPStakingInfo]);

  const govGorvernance = useMemo(() => {
    if (!userGovStakingInfo || !userANCBalance) {
      return undefined;
    }

    const staked = big(userGovStakingInfo.balance) as uANC<Big>;

    const stakable = userANCBalance.balance;

    return { staked, stakable };
  }, [userANCBalance, userGovStakingInfo]);

  const ustBorrow = useMemo(() => {
    if (!marketState || !borrowerInfo) {
      return undefined;
    }

    const reward = big(borrowerInfo.pending_rewards) as uANC<Big>;

    return { reward };
  }, [borrowerInfo, marketState]);

  const total = useMemo(() => {
    if (!ustBorrow || !ancUstLp || !ancPrice) {
      return undefined;
    }

    const reward = ustBorrow.reward.plus(ancUstLp.reward) as uANC<Big>;
    const rewardValue = reward.mul(ancPrice.ANCPrice) as uUST<Big>;

    return { reward, rewardValue };
  }, [ancPrice, ancUstLp, ustBorrow]);

  // ---------------------------------------------
  // presentation
  // ---------------------------------------------
  return (
    <section className={className}>
      <SubHeader>
        <div>
          <h2>Rewards</h2>
        </div>
        <div>
          <ActionButton component={Link} to={`/${govPathname}/claim/all`}>
            Claim All Rewards
          </ActionButton>
        </div>
      </SubHeader>

      <Section>
        <h3>
          <div>
            <label>Total Reward</label>{' '}
            {total?.reward
              ? formatANCWithPostfixUnits(demicrofy(total.reward))
              : 0}{' '}
            ANC
          </div>
          <div>
            <label>Total Reward Value</label>{' '}
            {total?.rewardValue
              ? formatUSTWithPostfixUnits(demicrofy(total.rewardValue))
              : 0}{' '}
            UST
          </div>
        </h3>

        <HorizontalScrollTable
          minWidth={1100}
          startPadding={20}
          endPadding={20}
        >
          <colgroup>
            <col style={{ minWidth: 210 }} />
            <col style={{ minWidth: 205 }} />
            <col style={{ minWidth: 340 }} />
            <col style={{ minWidth: 160 }} />
            <col style={{ minWidth: 200 }} />
            <col style={{ minWidth: 100 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Rewards Pool</th>
              <th>
                <IconSpan>
                  APR <InfoTooltip>Annualized Staking Returns</InfoTooltip>
                </IconSpan>
              </th>
              <th>
                <IconSpan>
                  Staked{' '}
                  <InfoTooltip>
                    Quantity of staked assets from the corresponding reward
                    pools
                  </InfoTooltip>
                </IconSpan>
              </th>
              <th>Stakable</th>
              <th>
                <IconSpan>
                  Reward{' '}
                  <InfoTooltip>
                    Quantity of claimable rewards for the corresponding staking
                    pool
                  </InfoTooltip>
                </IconSpan>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ANC Governance</td>
              <td>
                {govRewards && govRewards.length > 0
                  ? formatRate(govRewards[0].CurrentAPY)
                  : 0}{' '}
                %
              </td>
              <td>
                {govGorvernance?.staked
                  ? formatANCWithPostfixUnits(demicrofy(govGorvernance.staked))
                  : 0}{' '}
                ANC
              </td>
              <td>
                {govGorvernance?.stakable
                  ? formatANCWithPostfixUnits(
                      demicrofy(govGorvernance.stakable),
                    )
                  : 0}{' '}
                ANC
              </td>
              <td>
                <IconSpan>
                  Automatically re-staked{' '}
                  <InfoTooltip>
                    Protocol fee paid from withdrawing collateral is distributed
                    to ANC stakers and increases staked ANC
                  </InfoTooltip>
                </IconSpan>
              </td>
              <td>
                <MoreMenu size="25px">
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/rewards/${ancGovernancePathname}/stake`}
                  >
                    Stake
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/rewards/${ancGovernancePathname}/unstake`}
                  >
                    Unstake
                  </MenuItem>
                </MoreMenu>
              </td>
            </tr>
            <tr>
              <td>
                <p>ANC-UST LP</p>
                <p style={{ fontSize: 12 }}>
                  <IconSpan>
                    {ancUstLp?.withdrawableAssets
                      ? formatANCWithPostfixUnits(
                          demicrofy(ancUstLp.withdrawableAssets.anc),
                        )
                      : 0}{' '}
                    ANC +{' '}
                    {ancUstLp?.withdrawableAssets
                      ? formatUSTWithPostfixUnits(
                          demicrofy(ancUstLp.withdrawableAssets.ust),
                        )
                      : 0}{' '}
                    UST{' '}
                    <InfoTooltip>
                      Amount of withdrawable assets from the ANC-UST pair
                    </InfoTooltip>
                  </IconSpan>
                </p>
              </td>
              <td>
                {lpRewards && lpRewards.length > 0
                  ? formatRate(lpRewards[0].APY)
                  : 0}{' '}
                %
              </td>
              <td>
                {ancUstLp?.staked ? formatLP(demicrofy(ancUstLp.staked)) : 0} LP
              </td>
              <td
                className={
                  big(ancUstLp?.stakable ?? 0).gt(0) ? 'warning' : undefined
                }
              >
                {ancUstLp?.stakable
                  ? formatLP(demicrofy(ancUstLp.stakable))
                  : 0}{' '}
                LP
              </td>
              <td>
                {ancUstLp?.reward
                  ? formatANCWithPostfixUnits(demicrofy(ancUstLp.reward))
                  : 0}{' '}
                ANC
              </td>
              <td>
                <MoreMenu size="25px">
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/rewards/${ancUstLpPathname}/provide`}
                  >
                    Provide
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/rewards/${ancUstLpPathname}/withdraw`}
                  >
                    Withdraw
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/rewards/${ancUstLpPathname}/stake`}
                  >
                    Stake
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/rewards/${ancUstLpPathname}/unstake`}
                  >
                    Unstake
                  </MenuItem>
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/claim/${ancUstLpPathname}`}
                  >
                    Claim
                  </MenuItem>
                </MoreMenu>
              </td>
            </tr>
            <tr>
              <td>UST Borrow</td>
              <td>
                {borrowerDistributionAPYs && borrowerDistributionAPYs.length > 0
                  ? formatRate(borrowerDistributionAPYs[0].DistributionAPY)
                  : 0}{' '}
                %
              </td>
              <td></td>
              <td></td>
              <td>
                {ustBorrow?.reward
                  ? formatUSTWithPostfixUnits(demicrofy(ustBorrow.reward))
                  : 0}{' '}
                ANC
              </td>
              <td>
                <MoreMenu size="25px">
                  <MenuItem
                    component={Link}
                    to={`/${govPathname}/claim/${ustBorrowPathname}`}
                  >
                    Claim
                  </MenuItem>
                </MoreMenu>
              </td>
            </tr>
          </tbody>
        </HorizontalScrollTable>
      </Section>
    </section>
  );
}

export const Rewards = styled(RewardsBase)`
  // ---------------------------------------------
  // style
  // ---------------------------------------------
  h3 {
    display: flex;

    > div:nth-of-type(2) {
      margin-left: 40px;
    }

    font-size: 14px;
    color: ${({ theme }) => theme.textColor};
    font-weight: 700;

    margin-bottom: 60px;

    label {
      color: ${({ theme }) => theme.dimTextColor};
      font-weight: 500;

      margin-right: 10px;
    }
  }

  table {
    min-width: 1000px;

    tbody {
      td {
        font-size: 16px;
        letter-spacing: -0.3px;
      }
    }

    thead,
    tbody {
      th:nth-child(2),
      td:nth-child(2),
      th:nth-child(3),
      td:nth-child(3),
      th:nth-child(4),
      td:nth-child(4),
      th:nth-child(5),
      td:nth-child(5) {
        text-align: center;
      }

      .warning {
        color: ${({ theme }) => theme.colors.negative};
      }

      th:nth-child(6),
      td:nth-child(6) {
        text-align: right;
      }
    }
  }

  // ---------------------------------------------
  // layout
  // ---------------------------------------------
  // under tablet
  @media (max-width: ${screen.tablet.max}px) {
    h3 {
      display: flex;
      flex-direction: column;

      > div {
        label {
          display: inline-block;
          width: 150px;
        }
      }

      > div:nth-of-type(2) {
        margin-left: 0;
        margin-top: 10px;
      }
    }
  }
`;
