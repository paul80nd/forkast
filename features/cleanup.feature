Feature: Clean up unwanted recipes
  As someone curating my collection
  I want to bulk-delete recipes I've binned
  So that the collection stays to the ones I actually want, even across re-imports

  Background:
    Given the app starts with no recipes

  Scenario: Bulk-deleting removes the selected recipes for good
    Given the store holds recipes "r1, r2, r3"
    When I delete recipes "r1, r3"
    Then the app holds recipes "r2"

  Scenario: Bulk delete cascades to a group, dissolving it below two members
    Given the store holds recipes "r1, r2, r3"
    And I have grouped recipes "r1, r2"
    When I delete recipes "r1"
    Then recipe "r2" is in no group
    And there are no groups

  Scenario: Deleting a recipe purges its ratings, history and plan slot
    Given the store holds recipes "r1, r2"
    And recipe "r1" is rated 5 stars
    And recipe "r1" was cooked
    And recipe "r1" is in the plan
    When I delete recipes "r1"
    Then recipe "r1" has no curation row
    And recipe "r1" has no cooked history
    And the plan does not contain "r1"
