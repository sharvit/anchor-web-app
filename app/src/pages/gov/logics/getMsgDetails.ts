import { anchorToken } from '@anchor-protocol/types';
import { AccountLink } from 'components/AccountLink';
import { createElement, ReactNode } from 'react';

export function getMsgDetails(
  msg: anchorToken.gov.ParsedExecuteMsg | undefined | null,
): { name: string; value: ReactNode }[] {
  if (msg?.msg) {
    if ('spend' in msg.msg) {
      return Object.keys(msg.msg['spend']).map((name) => {
        return {
          name: name[0].toUpperCase() + name.slice(1),
          // @ts-ignore
          value: msg.msg['spend'][name],
        };
      });
    } else if ('update_config' in msg.msg) {
      return Object.keys(msg.msg['update_config']).map((name) => {
        return {
          name,
          // @ts-ignore
          value: msg.msg['update_config'][name],
        };
      });
    } else if ('update_whitelist' in msg.msg) {
      return Object.keys(msg.msg['update_whitelist']).map((name) => {
        return name === 'collateral_token'
          ? {
              name: 'Collateral',
              value: createElement(AccountLink, {
                // @ts-ignore
                address: msg.msg['update_whitelist'][name],
              }),
            }
          : {
              name: 'Max LTV',
              // @ts-ignore
              value: msg.msg['update_whitelist'][name],
            };
      });
    }
  }

  return [];
}
