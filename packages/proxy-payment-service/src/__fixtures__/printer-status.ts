/* eslint-disable quote-props */

import type { TStatus } from '../typings/printer/StarTSP650';

const STAR_TSP650_STATUS: TStatus = {
  'info': {
    'shift': {
      'dt_closed': '1601-01-01T00:00:00.000Z',
      'dt_open': '2020-05-06T17:05:56.280Z',
      'status': 'open',
    },
    'fiscal': {
      'fiscal_doc_sign': 4227111588,
      'kkt_reg_num': '0000012121027529',
      'fiscal_doc_num': 1,
      'tax_system': [
          'OSN',
      ],
      'inn': '7728240240  ',
      'pos_address': '',
      'kkt_serial': '199031008599',
      'status': 'fiscal',
      'dt_fiscal': '2020-04-11T14:03:00.000Z',
      'inn_cashier': '',
    },
    'fn': {
      'current_doc_code': 0,
      'firmware': 'fn debug V 2.12',
      'current_doc_details': '',
      'warning_details': '',
      'dt_last_operation': '2020-05-06T17:10:00.000Z',
      'registration_left': 29,
      'registration_count': 1,
      'dt_valid_till': '2021-07-25T00:00:00.000Z',
      'status_code': 3,
      'status_details': '',
      'firmware_type': 'debug',
      'last_doc_num': 35,
      'warning_flag': 0,
    },
    'counters': {
      'drawer_cash': '200.00',
    },
    'ofd': {
      'is_reading_ofd': false,
      'is_wating_for_command_response': false,
      'has_ofd_command': false,
      'first_message_num': 0,
      'connect_code': 1,
      'connect_details': '',
      'is_connect_changed': false,
      'is_connected': true,
      'has_message_to_send': false,
      'message_count': 0,
      'is_waiting_for_response': false,
      'connect_string': 'ofdt.platformaofd.ru',
      'status': 'ok',
    },
    'tech': {
      'datetime': '2020-05-07T16:21:10.280Z',
      'error_code': 0,
      'error_details': '',
      'firmware': '4.4.19.15',
      'status': 'ok',
    },
  },
  'status': 'ok',
};

export { STAR_TSP650_STATUS };
