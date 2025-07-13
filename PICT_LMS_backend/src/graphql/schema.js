const { GraphQLSchema, GraphQLObjectType } = require("graphql");
const { userQueries, userMutations, UserType } = require("./types/user");
const { bookQueries, bookMutations, BookType } = require("./types/book");
const {
  authorQueries,
  authorMutations,
  AuthorType,
} = require("./types/author");
const {
  publicationQueries,
  publicationMutations,
  PublicationType,
} = require("./types/publication");
const {
  paymentQueries,
  paymentMutations,
  PaymentType,
} = require("./types/payment");
const {
  issueRecordQueries,
  issueRecordMutations,
  IssueRecordType,
} = require("./types/issueRecord");
const {
  bookMetadataQueries,
  bookMetadataMutations,
  BookMetadataType,
} = require("./types/bookMetadata");

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    ...userQueries,
    ...bookQueries,
    ...authorQueries,
    ...publicationQueries,
    ...paymentQueries,
    ...issueRecordQueries,
    ...bookMetadataQueries,
  },
});

const Mutation = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    ...userMutations,
    ...bookMutations,
    ...authorMutations,
    ...publicationMutations,
    ...paymentMutations,
    ...issueRecordMutations,
    ...bookMetadataMutations,
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: Mutation,
  types: [
    UserType,
    BookType,
    AuthorType,
    PublicationType,
    PaymentType,
    IssueRecordType,
    BookMetadataType,
  ],
});
