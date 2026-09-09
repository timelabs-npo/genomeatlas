"""Dependency-free validation of the JSON Schema subset used by GenomeAtlas."""
import datetime
import json
import math
import re


def validate(value, schema, path='$', depth=0):
    errors = []
    if depth > 12:
        return [f'{path}: nesting limit exceeded']

    def fail(message):
        errors.append(f'{path}: {message}')

    def same(a, b):
        return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)

    if 'const' in schema and not same(value, schema['const']):
        fail('unexpected constant')
    if 'enum' in schema and not any(same(value, item) for item in schema['enum']):
        fail('value outside allowed set')
    checks = {'object': type(value) is dict, 'array': type(value) is list,
              'string': type(value) is str, 'integer': type(value) is int and abs(value) <= 9007199254740991,
              'number': (type(value) is int and abs(value) <= 9007199254740991) or (type(value) is float and math.isfinite(value)),
              'boolean': type(value) is bool, 'null': value is None}
    if 'type' in schema and not checks[schema['type']]:
        return errors + [f"{path}: expected {schema['type']}"]
    if type(value) is str:
        if 'maxLength' in schema and len(value) > schema['maxLength']:
            fail('text too long')
        if 'pattern' in schema and not re.search(schema['pattern'], value, flags=re.ASCII):
            fail('invalid format')
        if schema.get('format') == 'date-time':
            try:
                datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                fail('invalid UTC timestamp')
    if type(value) in (int, float):
        if 'minimum' in schema and value < schema['minimum']:
            fail('below minimum')
        if 'maximum' in schema and value > schema['maximum']:
            fail('above maximum')
    if type(value) is list:
        if 'minItems' in schema and len(value) < schema['minItems']:
            fail('too few items')
        if 'maxItems' in schema and len(value) > schema['maxItems']:
            fail('too many items')
        if schema.get('uniqueItems') and len(set(json.dumps(x, sort_keys=True) for x in value)) != len(value):
            fail('duplicate items')
        if 'items' in schema:
            for index, item in enumerate(value):
                errors.extend(validate(item, schema['items'], f'{path}[{index}]', depth + 1))
    if type(value) is dict:
        for keyword, compare in [('minProperties', lambda a, b: a < b), ('maxProperties', lambda a, b: a > b)]:
            if keyword in schema and compare(len(value), schema[keyword]):
                fail('property count outside limits')
        for key in schema.get('required', []):
            if key not in value:
                fail(f'missing {key}')
        for key, item in value.items():
            if key in ('__proto__', 'constructor', 'prototype'):
                fail('reserved property')
                continue
            if 'propertyNames' in schema:
                errors.extend(validate(key, schema['propertyNames'], f'{path} property name', depth + 1))
            if key in schema.get('properties', {}):
                errors.extend(validate(item, schema['properties'][key], f'{path}.{key}', depth + 1))
            elif schema.get('additionalProperties') is False:
                fail('unexpected property')
            elif type(schema.get('additionalProperties')) is dict:
                errors.extend(validate(item, schema['additionalProperties'], f'{path} entry', depth + 1))
    return errors


def validate_probe(value, schema):
    errors = validate(value, schema)
    if not errors and value['claimed_result'] == 'PASS' and value['exit_code'] != 0:
        errors.append('PASS claim contradicts nonzero exit code')
    return errors
