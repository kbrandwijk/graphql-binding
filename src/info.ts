import {
  GraphQLResolveInfo,
  GraphQLObjectType,
  FieldNode,
  GraphQLSchema,
  SelectionSetNode,
  parse,
} from 'graphql'
import { isScalar, getTypeForRootFieldName } from './utils'

export function buildInfoForAllScalars(
  rootFieldName: string,
  schema: GraphQLSchema,
  operation: 'query' | 'mutation',
): GraphQLResolveInfo {
  const fieldNodes: FieldNode[] = []
  const type = getTypeForRootFieldName(rootFieldName, operation, schema)

  if (type instanceof GraphQLObjectType) {
    const fields = type.getFields()
    const selections = Object.keys(fields)
      .filter(f => isScalar(fields[f].type))
      .map<FieldNode>(fieldName => {
        const field = fields[fieldName]
        return {
          kind: 'Field',
          name: { kind: 'Name', value: field.name },
        }
      })
    const fieldNode: FieldNode = {
      kind: 'Field',
      name: { kind: 'Name', value: rootFieldName },
      selectionSet: { kind: 'SelectionSet', selections },
    }

    fieldNodes.push(fieldNode)
  }

  const parentType =
    operation === 'query' ? schema.getQueryType() : schema.getMutationType()!

  return {
    fieldNodes,
    fragments: {},
    schema,
    fieldName: rootFieldName,
    returnType: type,
    parentType,
    path: undefined,
    rootValue: null,
    operation: {
      kind: 'OperationDefinition',
      operation,
      selectionSet: { kind: 'SelectionSet', selections: [] },
    },
    variableValues: {},
  }
}

export function buildInfoFromFragment(
  rootFieldName: string,
  schema: GraphQLSchema,
  operation: 'query' | 'mutation',
  query: string,
): GraphQLResolveInfo {
  const type = getTypeForRootFieldName(rootFieldName, operation, schema)
  const fieldNode: FieldNode = {
    kind: 'Field',
    name: { kind: 'Name', value: rootFieldName },
    selectionSet: extractQuerySelectionSet(query),
  }

  return {
    fieldNodes: [fieldNode],
    fragments: {},
    schema,
    fieldName: rootFieldName,
    returnType: type,
    parentType: schema.getQueryType(),
    path: undefined,
    rootValue: null,
    operation: {
      kind: 'OperationDefinition',
      operation,
      selectionSet: { kind: 'SelectionSet', selections: [] },
    },
    variableValues: {},
  }
}

function extractQuerySelectionSet(query: string): SelectionSetNode {
  const document = parse(query)
  const queryNode = document.definitions[0]
  if (
    !queryNode ||
    queryNode.kind !== 'OperationDefinition' ||
    queryNode.operation !== 'query'
  ) {
    throw new Error(`Invalid query: ${query}`)
  }

  return queryNode.selectionSet
}