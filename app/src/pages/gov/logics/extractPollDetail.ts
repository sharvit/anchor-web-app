import { formatRate } from '@anchor-protocol/notation';
import { anchorToken, cw20, Rate, uANC } from '@anchor-protocol/types';
import big from 'big.js';
import { getMsgTitle } from 'pages/gov/logics/getMsgTitle';

export interface PollDetail {
  poll: anchorToken.gov.PollResponse;

  vote: {
    yes: number;
    no: number;
    total: number;
    threshold: number;
  };

  quorum: {
    current: number;
    gov: number;
  };

  baseline: {
    value: number;
    label: string;
  };

  type: string;

  endsIn: Date;

  msgs: anchorToken.gov.ParsedExecuteMsg[] | null;
}

export function extractPollDetail(
  poll: anchorToken.gov.PollResponse,
  govANCBalance: cw20.BalanceResponse<uANC>,
  govState: anchorToken.gov.StateResponse,
  govConfig: anchorToken.gov.ConfigResponse,
  currentHeight: number,
): PollDetail {
  const total: number =
    poll.status !== 'in_progress' && poll.total_balance_at_end_poll
      ? +poll.total_balance_at_end_poll
      : poll.staked_amount
      ? +poll.staked_amount
      : big(govANCBalance.balance).minus(govState.total_deposit).toNumber();

  const yes: number = +poll.yes_votes;

  const no: number = +poll.no_votes;

  const threshold: number = big(yes + no)
    .mul(govConfig.threshold)
    .toNumber();

  const quorum = {
    current: (yes + no) / total,
    gov: +govConfig.quorum,
  };

  const baseline =
    quorum.current > quorum.gov
      ? {
          value: (threshold / total) * total,
          label: 'Pass Threshold',
        }
      : {
          value: big(quorum.gov).mul(total).toNumber(),
          label: `Quorum ${formatRate(quorum.gov as Rate<number>)}%`,
        };

  const endsIn: Date = new Date(
    (poll.end_height - currentHeight) * 6000 + Date.now(),
  );

  let msgs: anchorToken.gov.ParsedExecuteMsg[] | null = null;
  let type: string = 'TEXT';

  if (Array.isArray(poll.execute_data)) {
    msgs = poll.execute_data.map(({ msg, order, contract }) => {
      return {
        order,
        contract,
        msg: !!msg && JSON.parse(atob(msg)),
      };
    });

    if (poll.execute_data.length > 1) {
      type = 'Multiple Execute';
    } else if (poll.execute_data.length === 1) {
      type = getMsgTitle(msgs[0]);
    }
  }

  return {
    poll,

    vote: {
      yes,
      no,
      total,
      threshold,
    },

    quorum,

    baseline,

    type,

    endsIn,

    msgs,
  };
}
