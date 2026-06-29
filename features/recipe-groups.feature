Feature: Group related recipes
  As someone curating variants of the same dish
  I want to link related recipes into a symmetric group
  So that each one can point to its alternatives and deletions stay consistent

  Background:
    Given no recipes are grouped

  Scenario: Grouping recipes links them symmetrically
    When I group recipes "r1, r2, r3"
    Then recipe "r1" is grouped with "r2, r3"
    And recipe "r3" is grouped with "r1, r2"

  Scenario: A recipe belongs to at most one group
    Given I have grouped recipes "r1, r2"
    When I group recipes "r2, r3"
    Then recipe "r2" is grouped with "r3"
    And recipe "r1" is in no group

  Scenario: A recipe's "see also" lists its sibling variants with titles
    Given I have grouped recipes "r1, r2, r3"
    Then the see-also for "r1" lists "r2, r3"
    And the see-also for "r1" shows "r2" titled "Recipe r2"

  Scenario: An ungrouped recipe has no "see also"
    Given I have grouped recipes "r1, r2"
    Then the see-also for "r3" is empty

  Scenario: A group needs at least two members
    When I try to group recipes "r1"
    Then the grouping is rejected
    And there are no groups

  Scenario: Deleting a grouped recipe removes it from its group
    Given I have grouped recipes "r1, r2, r3"
    When I delete recipe "r2"
    Then recipe "r1" is grouped with "r3"
    And recipe "r2" is in no group

  Scenario: Deleting a recipe that would leave one member dissolves the group
    Given I have grouped recipes "r1, r2"
    When I delete recipe "r2"
    Then recipe "r1" is in no group
    And there are no groups
